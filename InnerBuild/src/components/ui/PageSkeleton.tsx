import { Pattern } from "@/components/ui/v-skeleton-8";

export function PageSkeleton() {
  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl flex items-center justify-center animate-fade-in">
        <Pattern />
      </div>
    </div>
  );
}

export default PageSkeleton;
