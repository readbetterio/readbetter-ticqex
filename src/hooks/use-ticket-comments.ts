"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiFetch, apiFetchList } from "@/lib/api-client";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  CommentThreadOrder,
  TicketComment,
  TicketCommentsListResponse,
} from "@/types/comments";

const COMMENTS_PER_PAGE = 25;
const OPTIMISTIC_COMMENT_ID_PREFIX = "optimistic-";

type CommentMutationContext = {
  previous: InfiniteData<TicketCommentsListResponse> | undefined;
  previousCount?: number;
  tempId?: string;
};

export function ticketCommentsBaseQueryKey(ticketId: string) {
  return ["ticket", ticketId, "comments"] as const;
}

export function ticketCommentsQueryKey(
  ticketId: string,
  threadOrder?: CommentThreadOrder,
) {
  return [...ticketCommentsBaseQueryKey(ticketId), threadOrder] as const;
}

export function ticketCommentCountQueryKey(ticketId: string) {
  return [...ticketCommentsBaseQueryKey(ticketId), "count"] as const;
}

function ticketCommentsInfiniteQueryOptions(
  ticketId: string,
  threadOrder: CommentThreadOrder,
) {
  return {
    queryKey: ticketCommentsQueryKey(ticketId, threadOrder),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const page = pageParam ?? 1;
      return apiFetchList<TicketComment>(
        `/api/v1/tickets/${ticketId}/comments?page=${page}&per_page=${COMMENTS_PER_PAGE}`,
      );
    },
    initialPageParam: 1 as const,
    getNextPageParam: (lastPage: TicketCommentsListResponse) => {
      const { page, per_page, total } = lastPage.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  };
}

export function useTicketComments(
  ticketId: string,
  threadOrder: CommentThreadOrder = "oldest_first",
) {
  return useInfiniteQuery(ticketCommentsInfiniteQueryOptions(ticketId, threadOrder));
}

export function useTicketCommentCount(ticketId: string) {
  const query = useQuery({
    queryKey: ticketCommentCountQueryKey(ticketId),
    queryFn: async () => {
      const response = await apiFetchList<TicketComment>(
        `/api/v1/tickets/${ticketId}/comments?page=1&per_page=1`,
      );
      return response.meta.total;
    },
  });

  return {
    count:
      query.isPending || query.data === undefined ? null : query.data,
  };
}

export function flattenTicketComments(
  pages: TicketCommentsListResponse[] | undefined,
): TicketComment[] {
  if (!pages?.length) return [];
  return pages.flatMap((page) => page.data);
}

function formatOptimisticAuthorLabel(
  user: { username: string; email: string } | null,
): string {
  if (!user) return "You";
  if (user.username && user.email) {
    return `${user.username} · ${user.email}`;
  }
  return user.username || user.email || "You";
}

function buildOptimisticComment(
  ticketId: string,
  body: string,
  tempId: string,
  user: { id: string; username: string; email: string } | null,
): TicketComment {
  return {
    id: tempId,
    ticket_id: ticketId,
    body,
    author_type: "agent",
    author_id: user?.id ?? null,
    api_key_id: null,
    author_label: formatOptimisticAuthorLabel(user),
    created_at: new Date().toISOString(),
    can_manage: true,
  };
}

function adjustFirstPageTotal(
  pages: TicketCommentsListResponse[],
  delta: number,
): TicketCommentsListResponse[] {
  if (!pages.length) return pages;
  return pages.map((page, index) =>
    index === 0
      ? { ...page, meta: { ...page.meta, total: page.meta.total + delta } }
      : page,
  );
}

function insertCommentIntoCache(
  data: InfiniteData<TicketCommentsListResponse>,
  comment: TicketComment,
  threadOrder: CommentThreadOrder,
): InfiniteData<TicketCommentsListResponse> {
  if (!data.pages.length) {
    return {
      ...data,
      pages: [
        {
          data: [comment],
          meta: { total: 1, page: 1, per_page: COMMENTS_PER_PAGE },
        },
      ],
    };
  }

  const pages = adjustFirstPageTotal(data.pages, 1);

  if (threadOrder === "newest_first") {
    const [first, ...rest] = pages;
    return {
      ...data,
      pages: [{ ...first, data: [comment, ...first.data] }, ...rest],
    };
  }

  const lastIndex = pages.length - 1;
  return {
    ...data,
    pages: pages.map((page, index) =>
      index === lastIndex
        ? { ...page, data: [...page.data, comment] }
        : page,
    ),
  };
}

function replaceCommentInCache(
  data: InfiniteData<TicketCommentsListResponse>,
  matchId: string,
  replacement: TicketComment,
): InfiniteData<TicketCommentsListResponse> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((comment) =>
        comment.id === matchId ? replacement : comment,
      ),
    })),
  };
}

function updateCommentBodyInCache(
  data: InfiniteData<TicketCommentsListResponse>,
  commentId: string,
  body: string,
): InfiniteData<TicketCommentsListResponse> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((comment) =>
        comment.id === commentId ? { ...comment, body } : comment,
      ),
    })),
  };
}

function removeCommentFromCache(
  data: InfiniteData<TicketCommentsListResponse>,
  commentId: string,
): InfiniteData<TicketCommentsListResponse> {
  const hadComment = data.pages.some((page) =>
    page.data.some((comment) => comment.id === commentId),
  );
  if (!hadComment) return data;

  return {
    ...data,
    pages: adjustFirstPageTotal(
      data.pages.map((page) => ({
        ...page,
        data: page.data.filter((comment) => comment.id !== commentId),
      })),
      -1,
    ),
  };
}

function rollbackCommentsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  queryKey: ReturnType<typeof ticketCommentsQueryKey>,
  previous: InfiniteData<TicketCommentsListResponse> | undefined,
) {
  queryClient.setQueryData(queryKey, previous);
}

function adjustCommentCountCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
  delta: number,
) {
  const countKey = ticketCommentCountQueryKey(ticketId);
  queryClient.setQueryData<number>(countKey, (current) =>
    current !== undefined ? Math.max(0, current + delta) : current,
  );
}

function rollbackCommentCountCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
  previousCount: number | undefined,
) {
  const countKey = ticketCommentCountQueryKey(ticketId);
  if (previousCount === undefined) {
    queryClient.removeQueries({ queryKey: countKey });
    return;
  }
  queryClient.setQueryData(countKey, previousCount);
}

export function useTicketCommentMutations(
  ticketId: string,
  threadOrder: CommentThreadOrder = "oldest_first",
) {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const queryKey = ticketCommentsQueryKey(ticketId, threadOrder);
  const countKey = ticketCommentCountQueryKey(ticketId);

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch<TicketComment>(`/api/v1/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previous =
        queryClient.getQueryData<InfiniteData<TicketCommentsListResponse>>(
          queryKey,
        );
      const previousCount = queryClient.getQueryData<number>(countKey);
      const tempId = `${OPTIMISTIC_COMMENT_ID_PREFIX}${crypto.randomUUID()}`;
      const optimistic = buildOptimisticComment(ticketId, body, tempId, user);

      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) {
            return {
              pages: [
                {
                  data: [optimistic],
                  meta: { total: 1, page: 1, per_page: COMMENTS_PER_PAGE },
                },
              ],
              pageParams: [1],
            };
          }
          return insertCommentIntoCache(current, optimistic, threadOrder);
        },
      );
      adjustCommentCountCache(queryClient, ticketId, 1);

      return { previous, previousCount, tempId } satisfies CommentMutationContext;
    },
    onError: (_error, _body, context) => {
      rollbackCommentsCache(queryClient, queryKey, context?.previous);
      rollbackCommentCountCache(
        queryClient,
        ticketId,
        context?.previousCount,
      );
    },
    onSuccess: (created, _body, context) => {
      const tempId = context?.tempId;
      if (!tempId) return;

      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) return current;
          return replaceCommentInCache(current, tempId, created);
        },
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      apiFetch<TicketComment>(
        `/api/v1/tickets/${ticketId}/comments/${commentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ body }),
        },
      ),
    onMutate: async ({ commentId, body }) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<InfiniteData<TicketCommentsListResponse>>(
          queryKey,
        );

      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) return current;
          return updateCommentBodyInCache(current, commentId, body);
        },
      );

      return { previous } satisfies CommentMutationContext;
    },
    onError: (_error, _variables, context) => {
      rollbackCommentsCache(queryClient, queryKey, context?.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) return current;
          return replaceCommentInCache(current, updated.id, updated);
        },
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<{ deleted: true }>(
        `/api/v1/tickets/${ticketId}/comments/${commentId}`,
        {
          method: "DELETE",
        },
      ),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previous =
        queryClient.getQueryData<InfiniteData<TicketCommentsListResponse>>(
          queryKey,
        );
      const previousCount = queryClient.getQueryData<number>(countKey);

      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) return current;
          return removeCommentFromCache(current, commentId);
        },
      );
      adjustCommentCountCache(queryClient, ticketId, -1);

      return { previous, previousCount } satisfies CommentMutationContext;
    },
    onError: (_error, _commentId, context) => {
      rollbackCommentsCache(queryClient, queryKey, context?.previous);
      rollbackCommentCountCache(
        queryClient,
        ticketId,
        context?.previousCount,
      );
    },
  });

  return {
    createComment: createMutation.mutateAsync,
    updateComment: updateMutation.mutateAsync,
    deleteComment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function invalidateTicketComments(
  queryClient: ReturnType<typeof useQueryClient>,
  ticketId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: ticketCommentsBaseQueryKey(ticketId),
  });
}
