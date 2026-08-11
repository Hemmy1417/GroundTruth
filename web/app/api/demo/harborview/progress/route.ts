import { PROGRESS, parseAct, textResponse } from "../../content";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return textResponse(PROGRESS[parseAct(new URL(req.url).searchParams.get("act"))]);
}
