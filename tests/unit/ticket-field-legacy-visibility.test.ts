import { describe, expect, it } from "vitest";
import {
  CORE_TICKET_FIELD_IDS,
  buildTicketFieldVisibilityFromLegacy,
  customFieldId,
  resolveTicketFieldLayout,
} from "@shared/ticket-fields";

/** Contract mirrored from `20260603120000_ticket_field_visibility.sql`. */
describe("buildTicketFieldVisibilityFromLegacy (migration contract)", () => {
  const fieldA = "11111111-1111-1111-1111-111111111111";
  const fieldB = "22222222-2222-2222-2222-222222222222";
  const fieldC = "33333333-3333-3333-3333-333333333333";

  it("maps legacy core booleans to ticket_field_visibility entries", () => {
    const mapped = buildTicketFieldVisibilityFromLegacy(
      {
        show_contact_on_ticket: false,
        show_assignee_on_ticket: true,
        show_body_on_ticket: false,
        visible_ticket_field_ids: [],
      },
      [],
    );

    expect(mapped[CORE_TICKET_FIELD_IDS.title]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.contact]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.assignee]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.tags]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.description]).toEqual({
      showOnCard: false,
      showInTicket: false,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.preview]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(mapped[CORE_TICKET_FIELD_IDS.contact_address]).toEqual({
      showOnCard: false,
      showInTicket: true,
    });
  });

  it("sets custom ticket fields showInTicket from visible_ticket_field_ids", () => {
    const mapped = buildTicketFieldVisibilityFromLegacy(
      {
        show_contact_on_ticket: true,
        show_assignee_on_ticket: true,
        show_body_on_ticket: true,
        visible_ticket_field_ids: [fieldA, fieldC],
      },
      [{ id: fieldA }, { id: fieldB }, { id: fieldC }],
    );

    expect(mapped[customFieldId(fieldA)]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
    expect(mapped[customFieldId(fieldB)]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(mapped[customFieldId(fieldC)]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
  });

  it("treats empty visible_ticket_field_ids as hidden in ticket for all custom fields", () => {
    const mapped = buildTicketFieldVisibilityFromLegacy(
      {
        show_contact_on_ticket: true,
        show_assignee_on_ticket: true,
        show_body_on_ticket: true,
        visible_ticket_field_ids: [],
      },
      [{ id: fieldA }],
    );

    expect(mapped[customFieldId(fieldA)]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
  });

  it("ignores visible_ticket_field_ids not present in ticket custom field list", () => {
    const mapped = buildTicketFieldVisibilityFromLegacy(
      {
        show_contact_on_ticket: true,
        show_assignee_on_ticket: true,
        show_body_on_ticket: true,
        visible_ticket_field_ids: ["99999999-9999-9999-9999-999999999999"],
      },
      [{ id: fieldA }],
    );

    expect(mapped[customFieldId(fieldA)]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(mapped).not.toHaveProperty(
      customFieldId("99999999-9999-9999-9999-999999999999"),
    );
  });

  it("feeds resolveTicketFieldLayout so migrated settings drive ticket UI visibility", () => {
    const mapped = buildTicketFieldVisibilityFromLegacy(
      {
        show_contact_on_ticket: true,
        show_assignee_on_ticket: false,
        show_body_on_ticket: true,
        visible_ticket_field_ids: [fieldB],
      },
      [{ id: fieldA }, { id: fieldB }],
    );

    const layout = resolveTicketFieldLayout({
      settings: { ticket_field_visibility: mapped },
      customFields: [
        {
          id: fieldA,
          key: "priority",
          label: "Priority",
          type: "select",
          position: 0,
        },
        {
          id: fieldB,
          key: "region",
          label: "Region",
          type: "text",
          position: 1,
        },
      ],
    });

    expect(layout.visibility[CORE_TICKET_FIELD_IDS.assignee]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(layout.visibility[customFieldId(fieldA)]).toEqual({
      showOnCard: true,
      showInTicket: false,
    });
    expect(layout.visibility[customFieldId(fieldB)]).toEqual({
      showOnCard: true,
      showInTicket: true,
    });
    expect(
      layout.catalog.find((e) => e.id === customFieldId(fieldB))?.showInTicket,
    ).toBe(true);
    expect(
      layout.catalog.find((e) => e.id === customFieldId(fieldA))?.showInTicket,
    ).toBe(false);
  });
});
