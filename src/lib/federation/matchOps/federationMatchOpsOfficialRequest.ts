/** The browser asks the server to confirm; it never writes OFFICIAL or audit documents. */
import { federationMatchDocPath } from "../../../../functions/src/shared/federation/matchOps/federationMatchOpsFirestore";

export async function requestFederationMatchOfficial(
  request: { federationId: string; tournamentId: string; matchId: string },
  ports?: { sendCallable: (input: { federationId: string; tournamentId: string; matchId: string }) => Promise<unknown> },
): Promise<{ outcome: "OFFICIAL" | "NO_OP"; confirmationKey: string; auditId: string }> {
  federationMatchDocPath(request.federationId, request.tournamentId, request.matchId);
  const payload = {
    federationId: request.federationId,
    tournamentId: request.tournamentId,
    matchId: request.matchId,
  };
  const response = ports ? await ports.sendCallable(payload) : await (async () => {
    const [{ httpsCallable }, { functions }] = await Promise.all([
      import("firebase/functions"),
      import("../../firebase"),
    ]);
    const confirm = httpsCallable<typeof payload, unknown>(functions, "confirmFederationMatchOfficial");
    return (await confirm(payload)).data;
  })();
  if (typeof response !== "object" || response === null || !("outcome" in response) ||
      (response.outcome !== "OFFICIAL" && response.outcome !== "NO_OP") ||
      !("confirmationKey" in response) || typeof response.confirmationKey !== "string" ||
      !("auditId" in response) || typeof response.auditId !== "string") {
    throw new Error("Invalid OFFICIAL confirmation response");
  }
  return {
    outcome: response.outcome,
    confirmationKey: response.confirmationKey,
    auditId: response.auditId,
  };
}
