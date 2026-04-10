import { useLoading } from "@/context/LoadingContext";

export default function LoadingOverlay() {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-base-100/60">
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}
