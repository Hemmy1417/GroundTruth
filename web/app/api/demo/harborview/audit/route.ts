import { AUDIT_NOTE, textResponse } from "../../content";

// The challenger's exhibit — fixed content (no acts): the lender's audit
// note arguing the Act-2 inspection was preliminary.
export const dynamic = "force-dynamic";

export function GET() {
  return textResponse(AUDIT_NOTE);
}
