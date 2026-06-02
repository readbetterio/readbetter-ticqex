import { createAdminClient } from "@server/lib/supabase-admin";
import { ApiError } from "@server/lib/errors";
import { parsePagination } from "@server/lib/utils";
import {
  loadCustomFieldsMap,
  setCustomFields,
} from "@server/services/custom-fields";

export async function findOrCreateContact(username: string) {
  const db = createAdminClient();
  const { data: existing } = await db
    .from("contacts")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await db
    .from("contacts")
    .insert({ username })
    .select()
    .single();

  if (error) throw ApiError.internal(error.message);
  return data;
}

export async function listContacts(searchParams: URLSearchParams) {
  const db = createAdminClient();
  const { page, perPage, offset } = parsePagination(searchParams);

  const { data, count, error } = await db
    .from("contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) throw ApiError.internal(error.message);

  const ids = (data ?? []).map((c) => c.id);
  const fieldsMap = await loadCustomFieldsMap(db, "contact", ids);

  return {
    contacts: (data ?? []).map((c) => ({
      ...c,
      custom_fields: fieldsMap.get(c.id) ?? {},
    })),
    total: count ?? 0,
    page,
    perPage,
  };
}

export async function getContact(id: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("contacts").select("*").eq("id", id).single();
  if (error || !data) throw ApiError.notFound("Contact not found");

  const { count } = await db
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", id);

  const fieldsMap = await loadCustomFieldsMap(db, "contact", [id]);

  return {
    ...data,
    ticket_count: count ?? 0,
    custom_fields: fieldsMap.get(id) ?? {},
  };
}

export async function createContact(input: {
  username: string;
  custom_fields?: Record<string, unknown>;
}) {
  const db = createAdminClient();
  const { data, error } = await db
    .from("contacts")
    .insert({ username: input.username })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw ApiError.conflict("Contact username already exists");
    throw ApiError.internal(error.message);
  }

  await setCustomFields(db, "contact", data.id, input.custom_fields);
  const fieldsMap = await loadCustomFieldsMap(db, "contact", [data.id]);

  return { ...data, custom_fields: fieldsMap.get(data.id) ?? {} };
}

export async function updateContact(
  id: string,
  input: { username?: string; custom_fields?: Record<string, unknown> },
) {
  const db = createAdminClient();
  if (input.username) {
    const { error } = await db
      .from("contacts")
      .update({ username: input.username })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") throw ApiError.conflict("Username already exists");
      throw ApiError.internal(error.message);
    }
  }

  await setCustomFields(db, "contact", id, input.custom_fields);
  return getContact(id);
}

export async function deleteContact(id: string) {
  const db = createAdminClient();
  const { count } = await db
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("contact_id", id);

  if ((count ?? 0) > 0) {
    throw ApiError.conflict("Cannot delete contact with existing tickets");
  }

  const { error } = await db.from("contacts").delete().eq("id", id);
  if (error) throw ApiError.internal(error.message);
}
