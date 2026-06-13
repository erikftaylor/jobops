import { useState, useCallback, useEffect } from "react";
import { CareerModel } from "@shared/types";

interface CareerModelState {
  careerModel: CareerModel | null;
  loading: boolean;
  error: string | null;
  hash: string | null;
}

interface UseCareerModelResponse {
  careerModel: CareerModel | null;
  loading: boolean;
  error: string | null;
  hash: string | null;
  refresh: () => Promise<void>;
}

export function useCareerModel(
  jobId: string | null,
  positioningId?: string
): UseCareerModelResponse {
  const [state, setState] = useState<CareerModelState>({
    careerModel: null,
    loading: false,
    error: null,
    hash: null,
  });

  // Refresh function - manual refetch
  const refresh = useCallback(async () => {
    if (!jobId) {
      setState({
        careerModel: null,
        loading: false,
        error: "No job ID provided",
        hash: null,
      });
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const url = new URL(`/api/preview/${jobId}`, window.location.origin);
      if (positioningId) {
        url.searchParams.append("positioningId", positioningId);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch career model: ${response.statusText}`);
      }

      const data = await response.json();

      setState({
        careerModel: data.careerModel,
        loading: false,
        error: null,
        hash: data.careerModel?.hash || null,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [jobId, positioningId]);

  // Fetch on mount or when jobId changes
  useEffect(() => {
    if (!jobId) {
      setState({
        careerModel: null,
        loading: false,
        error: null,
        hash: null,
      });
      return;
    }

    refresh();
  }, [jobId, refresh]);

  return {
    careerModel: state.careerModel,
    loading: state.loading,
    error: state.error,
    hash: state.hash,
    refresh,
  };
}
