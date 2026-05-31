import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMe } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export function useAuth() {
  const setUser = useAuthStore((state) => state.setUser);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000
  });
  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
  return query;
}
