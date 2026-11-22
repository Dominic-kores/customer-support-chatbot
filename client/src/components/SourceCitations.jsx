
import { BookOpen } from "lucide-react";

export default function SourceCitations({
  sources = []
}) {
  // Hide citations when no FAQ sources were retrieved.
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-violet-100 pt-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-600">
        <BookOpen size={15} />
        Knowledge Base Sources
      </p>

      <div className="flex flex-wrap gap-2">
        {sources.map(source => (
          <div
            key={source.id}
            title={source.content}
            className="rounded-full border border-violet-200 bg-gradient-to-r from-pink-50 to-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700"
          >
            [{source.source_number}]{" "}
            {source.document_title}
          </div>
        ))}
      </div>
    </div>
  );
}
