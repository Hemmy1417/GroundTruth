import { INSPECTION, parseAct, textResponse } from "../../content";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return textResponse(INSPECTION[parseAct(new URL(req.url).searchParams.get("act"))]);
}
