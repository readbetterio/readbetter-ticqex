"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { apiFetch, apiFetchList } from "@/lib/api-client";
import type {
  CommentThreadOrder,
  TicketComment,
  TicketCommentsListResponse,
} from "@/types/comments";

const COMMENTS_PER_PAGE = 25;

export function ticketCommentsBaseQueryKey(ticketId: string) {
  return ["ticket", ticketId, "comments"] as const;
}

export function ticketCommentsQueryKey(
  ticketId: string,
  threadOrder?: CommentThreadOrder,
) {
  return [...ticketCommentsBaseQueryKey(ticketId), threadOrder] as const;
}

export function useTicketComments(
  ticketId: string,
  threadOrder: CommentThreadOrder = "oldest_first",
) {
  return useInfiniteQuery({
    queryKey: ticketCommentsQueryKey(ticketId, threadOrder),
    queryFn: async ({ pageParam }) => {
      const page = pageParam ?? 1;
      return apiFetchList<TicketComment>(
        `/api/v1/tickets/${ticketId}/comments?page=${page}&per_page=${COMMENTS_PER_PAGE}`,
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, per_page, total } = lastPage.meta;
      return page * per_page < total ? page + 1 : undefined;
    },
  });
}

export function flattenTicketComments(
  pages: TicketCommentsListResponse[] | undefined,
): TicketComment[] {
  if (!pages?.length) return [];
  return pages.flatMap((page) => page.data);
}

export function useTicketCommentMutations(
  ticketId: string,
  threadOrder: CommentThreadOrder = "oldest_first",
) {
  const queryClient = useQueryClient();
  const queryKey = ticketCommentsQueryKey(ticketId, threadOrder);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch<TicketComment>(`/api/v1/tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: invalidate,
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
    onSuccess: (updated) => {
      queryClient.setQueryData<InfiniteData<TicketCommentsListResponse>>(
        queryKey,
        (current) => {
          if (!current) return current;
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((comment) =>
                comment.id === updated.id ? updated : comment,
              ),
            })),
          };
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
    onSuccess: invalidate,
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
