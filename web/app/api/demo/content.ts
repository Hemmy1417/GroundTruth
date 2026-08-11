// Demo evidence — the "real world" the Harborview Tower demo controls.
// Served as public routes so StudioNet validators fetch them like any web
// source. Acts are addressed by ?act=1|2|3 (fixed, independently hashable
// URLs — the demo moves acts via the agreement's registered source URLs).
// DEMO.md states this honestly: pages are demo-controlled; the fetch → hash
// → judge → consensus → settle machinery is production.

export type DemoAct = 1 | 2 | 3;

export const PROGRESS: Record<DemoAct, string> = {
  1: `HARBORVIEW TOWER — MONTHLY CONSTRUCTION PROGRESS REPORT
Prepared by: Meridian Site Management Ltd (project managers)

Reporting period summary — Milestone 3 (structural completion)

Structural frame: levels 1-14 of 22 complete. Core walls poured to level 15.
Steel erection ongoing on levels 15-16; decking on 14. Overall structural
completion is assessed at 60 percent against the Milestone 3 scope.

Programme: structural works tracking 2 weeks behind the baseline programme
owing to the crane outage in week 14; recovery plan in place, second tower
crane commissioned. Concrete strength results: all cubes passing at 28 days.

Next period: complete steel to level 18, close decking through level 16.
No structural inspection has been requested yet — the frame is not at a
stage where the completion inspection would be meaningful.`,
  2: `HARBORVIEW TOWER — MONTHLY CONSTRUCTION PROGRESS REPORT
Prepared by: Meridian Site Management Ltd (project managers)

Reporting period summary — Milestone 3 (structural completion)

Structural frame: levels 1-21 of 22 complete; level 22 steel erected, final
decking pours completed this week. Core complete to roof level. Overall
structural completion is assessed at 95 percent against the Milestone 3
scope, with only parapet steel and two transfer-beam closures outstanding.

A structural completion inspection was carried out on the 26th by the
project's consulting engineer. The inspection note records the primary frame
as substantially complete and structurally sound; the formal certificate is
being processed. Concrete strength results: all cubes passing.

Next period: parapet steel, transfer-beam closures, snagging.`,
  3: `HARBORVIEW TOWER — MONTHLY CONSTRUCTION PROGRESS REPORT
Prepared by: Meridian Site Management Ltd (project managers)

Reporting period summary — Milestone 3 (structural completion)

Structural frame: all 22 levels complete including parapet steel and both
transfer-beam closures. Overall structural completion is assessed at 100
percent against the Milestone 3 scope.

The FINAL structural completion inspection was carried out on the 8th by the
consulting engineer together with the independent checker. The final
inspection PASSED: the certificate of structural completion has been issued
and lodged with the building control registry. All concrete and steel test
records are closed out.

Next period: facade package mobilisation.`,
};

export const INSPECTION: Record<DemoAct, string> = {
  1: `HARBORTOWN BUILDING CONTROL REGISTRY — public inspection record

Project: HARBORVIEW TOWER (permit HT-2214-C)
Milestone: structural completion (Milestone 3)
Status: NO COMPLETION INSPECTION ON RECORD
The structural completion inspection for this permit has not been requested.
Interim inspections (foundations, levels 1-10 frame) are on record and
passed. Nothing in this record certifies structural completion.`,
  2: `HARBORTOWN BUILDING CONTROL REGISTRY — public inspection record

Project: HARBORVIEW TOWER (permit HT-2214-C)
Milestone: structural completion (Milestone 3)
Status: PRELIMINARY INSPECTION NOTE RECEIVED — CERTIFICATE PENDING
A preliminary structural completion inspection note dated the 26th has been
received from the project's consulting engineer, recording the primary frame
as substantially complete. THE FORMAL CERTIFICATE HAS NOT BEEN ISSUED; the
independent check required for certification is not yet on record. This
entry does not constitute certified structural completion.`,
  3: `HARBORTOWN BUILDING CONTROL REGISTRY — public inspection record

Project: HARBORVIEW TOWER (permit HT-2214-C)
Milestone: structural completion (Milestone 3)
Status: CERTIFIED — FINAL INSPECTION PASSED
The final structural completion inspection dated the 8th, countersigned by
the independent checker, is on record. The certificate of structural
completion has been ISSUED and lodged. This entry constitutes certified
structural completion for permit HT-2214-C.`,
};

// The challenger's exhibit in Act 2: the payer disputes a SATISFIED verdict
// by pointing at the registry's "certificate pending" status.
export const AUDIT_NOTE = `INDEPENDENT PROJECT MONITOR — LENDER'S AUDIT NOTE
Harborview Tower, Milestone 3 (structural completion)

The consulting engineer's inspection note of the 26th is PRELIMINARY. Under
the facility agreement, structural completion for drawdown purposes requires
the CERTIFIED final inspection with the independent checker's countersignature
lodged at building control. As of this note, the registry records the
certificate as PENDING and the independent check as not on record. The
milestone should not be treated as satisfied until certification is lodged.`;

export function parseAct(raw: string | null): DemoAct {
  const n = Number(raw);
  return n === 2 || n === 3 ? (n as DemoAct) : 1;
}

export function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}
