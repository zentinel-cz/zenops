import { useLocation } from "wouter";
import { useCreateMowingRecord, getListMowingRecordsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import MowingForm, { type MowingFormData } from "@/components/MowingForm";

export default function MowingFormPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createMutation = useCreateMowingRecord();

  const handleSubmit = async (data: MowingFormData) => {
    try {
      const record = await createMutation.mutateAsync({ data });
      queryClient.invalidateQueries({ queryKey: getListMowingRecordsQueryKey() });
      toast.success("Záznam sečení byl uložen");
      navigate(`/seceni/${record.id}`);
    } catch {
      toast.error("Nepodařilo se uložit záznam");
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-foreground mb-5">Nový záznam sečení</h1>
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <MowingForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/seceni")}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
