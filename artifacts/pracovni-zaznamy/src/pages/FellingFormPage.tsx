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
    <div className="zenops-app-width">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Nový záznam kácení</h1>
        <p className="text-sm text-muted-foreground mt-1">Vyplňte údaje o dnešní práci v terénu</p>
      </div>
      <div className="zenops-form-shell rounded-[1.9rem] p-5 md:p-6 xl:p-7">
        <FellingForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/kaceni")}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
