"use client";

/**
 * Chain-read hooks. The CONTRACT is the source of truth for everything shown
 * as fact. Calm cadence throughout — StudioNet rate-limits per IP, and the
 * proxy's read-cache does the rest.
 */
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getAgreement,
  getAgreementsFor,
  getConfig,
  getEvaluation,
  getEvidence,
  getStats,
  listAgreements,
} from "./chain/groundtruth";
import { CONTRACT_CONFIGURED } from "./chain/config";

const enabled = (extra = true) => CONTRACT_CONFIGURED && extra;

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => getConfig(),
    enabled: enabled(),
    staleTime: 10 * 60_000,
  });
}

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => getStats(), enabled: enabled() });
}

export function useDocket(offset = 0, limit = 30) {
  return useQuery({
    queryKey: ["docket", offset, limit],
    queryFn: () => listAgreements(offset, limit),
    enabled: enabled(),
  });
}

export function useMyAgreementIds(address: string | null | undefined) {
  return useQuery({
    queryKey: ["mine", address?.toLowerCase()],
    queryFn: () => getAgreementsFor(address!, 0, 50),
    enabled: enabled(Boolean(address)),
  });
}

export function useAgreement(id: number | null | undefined) {
  return useQuery({
    queryKey: ["agreement", id],
    queryFn: () => getAgreement(id!),
    enabled: enabled(Boolean(id)),
  });
}

export function useEvaluation(id: number | null | undefined) {
  return useQuery({
    queryKey: ["evaluation", id],
    queryFn: () => getEvaluation(id!),
    enabled: enabled(Boolean(id)),
    staleTime: Infinity, // evaluations are immutable once recorded
  });
}

export function useEvaluationSet(ids: number[] | undefined) {
  return useQueries({
    queries: (ids ?? []).map((id) => ({
      queryKey: ["evaluation", id],
      queryFn: () => getEvaluation(id),
      enabled: enabled(),
      staleTime: Infinity,
    })),
  });
}

export function useEvidenceSet(ids: number[] | undefined) {
  return useQueries({
    queries: (ids ?? []).map((id) => ({
      queryKey: ["evidence", id],
      queryFn: () => getEvidence(id),
      enabled: enabled(),
      staleTime: Infinity, // evidence is immutable on-chain
    })),
  });
}
