import { cn } from "@/lib/utils";

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface SingleProps<T extends string | number> {
  label: string;
  options: Option<T>[];
  multiple?: false;
  value: T | null;
  onChange: (value: T) => void;
  helper?: string;
}

interface MultiProps<T extends string | number> {
  label: string;
  options: Option<T>[];
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
  helper?: string;
}

type SegmentedControlProps<T extends string | number> = SingleProps<T> | MultiProps<T>;

export function SegmentedControl<T extends string | number>(props: SegmentedControlProps<T>) {
  const { label, options, helper } = props;

  const isActive = (val: T) => {
    if (props.multiple) return props.value.includes(val);
    return props.value === val;
  };

  const handleClick = (val: T) => {
    if (props.multiple) {
      const current = props.value;
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      props.onChange(next);
    } else {
      props.onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = isActive(opt.value);
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => handleClick(opt.value)}
              aria-pressed={active}
              className={cn(
                "min-h-[52px] rounded-full px-4 text-sm font-semibold transition-colors border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/60 text-foreground border-border active:bg-muted",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
