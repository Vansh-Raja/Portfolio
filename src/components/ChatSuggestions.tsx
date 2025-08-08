import { Button } from "./ui/Button";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
}

export default function ChatSuggestions({
  suggestions,
  onSelectSuggestion,
}: ChatSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="border-t px-3 py-2">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Try one of these:
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            className="whitespace-normal text-left"
            onClick={() => onSelectSuggestion(s)}
          >
            {s}
          </Button>
        ))}
      </div>
    </div>
  );
}

