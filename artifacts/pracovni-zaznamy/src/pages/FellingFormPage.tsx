import { useLocation } from "wouter";
import { useCreateFellingRecord, getListFellingRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FellingForm, { type FellingFormData } from "@/components/FellingForm";

export default function FellingFormPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateFellingRecord();

  const handleSubmit = async (data: FellingFormData) => {
    try {
      await createMutation.mutateAsync({
        data: {
          ...data,
          workerIds: data.workerIds,
          vehicleIds: data.vehicleIds,
          machineIds: data.machineIds,
          accessoryIds: data.accessoryIds,
        },
      });
      queryClient.invalidateQueries({ queryKey: getListFellingRecordsQueryKey() });
      toast.success("Záznam kácení byl uložen");
      navigate("/kaceni");
    } catch {
      toast.error("Nepodařilo se uložit záznam");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Nový záznam kácení</h1>
        <p className="text-sm text-muted-foreground mt-1">Vyplňte údaje o dnešní práci v terénu</p>
      </div>
      <FellingForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/kaceni")}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
