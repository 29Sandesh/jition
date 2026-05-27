import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes stale time
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

/**
 * Custom hook to fetch tasks using TanStack Query
 */
export function useTasks(workspaceId: string, headers: Record<string, string>) {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch("/api/workItems", { headers });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      // Exclude subtasks from main boards
      const items = data.data || data.items || [];
      return items.filter((t: any) => !t.parentTaskId);
    },
    enabled: !!workspaceId,
  });
}

/**
 * Custom mutation hook to update task status with optimistic updates
 */
export function useUpdateTaskStatus(workspaceId: string, headers: Record<string, string>) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await fetch(`/api/workItems/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    // Optimistic Update
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks", workspaceId] });

      const previousTasks = qc.getQueryData(["tasks", workspaceId]);

      qc.setQueryData(["tasks", workspaceId], (old: any) => {
        if (!old) return [];
        return old.map((t: any) => (t._id === taskId ? { ...t, status } : t));
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        qc.setQueryData(["tasks", workspaceId], context.previousTasks);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

/**
 * Bind live WebSocket updates directly to the query cache without triggering full server fetches
 */
export function bindSocketToQueryCache(socket: any, workspaceId: string) {
  if (!socket) return;

  socket.on("task-created-c", (newTask: any) => {
    queryClient.setQueryData(["tasks", workspaceId], (old: any) => {
      if (!old) return [newTask];
      if (old.some((t: any) => t._id === newTask._id)) return old;
      return [...old, newTask];
    });
  });

  socket.on("task-updated-c", (updatedTask: any) => {
    queryClient.setQueryData(["tasks", workspaceId], (old: any) => {
      if (!old) return [];
      return old.map((t: any) => (t._id === updatedTask._id ? { ...t, ...updatedTask } : t));
    });
  });
}
