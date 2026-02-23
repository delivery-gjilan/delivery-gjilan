"use client";

import { useState, useCallback, useMemo } from "react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { Trash2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Rule {
  field: string;
  op: string;
  value: string;
}

export interface RuleGroup {
  operator: "AND" | "OR";
  rules: (Rule | RuleGroup)[];
}

export function isRuleGroup(item: Rule | RuleGroup): item is RuleGroup {
  return "operator" in item && "rules" in item;
}

// â”€â”€ Field definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface FieldDef {
  value: string;
  label: string;
  type: "select" | "number" | "date" | "text";
  options?: string[];
  category?: string;
}

const FIELD_DEFINITIONS: FieldDef[] = [
  // User fields
  { value: "role", label: "User Role", type: "select", options: ["CUSTOMER", "DRIVER", "SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUSINESS_EMPLOYEE"], category: "User" },
  { value: "email", label: "Email", type: "text", category: "User" },
  { value: "firstName", label: "First Name", type: "text", category: "User" },
  { value: "lastName", label: "Last Name", type: "text", category: "User" },
  { value: "createdAt", label: "Account Created", type: "date", category: "User" },
  // Behavior fields
  { value: "totalOrders", label: "Total Orders", type: "number", category: "Behavior" },
  { value: "deliveredOrders", label: "Delivered Orders", type: "number", category: "Behavior" },
  { value: "cancelledOrders", label: "Cancelled Orders", type: "number", category: "Behavior" },
  { value: "totalSpend", label: "Total Spend (â‚¬)", type: "number", category: "Behavior" },
  { value: "avgOrderValue", label: "Avg Order Value (â‚¬)", type: "number", category: "Behavior" },
  { value: "firstOrderAt", label: "First Order Date", type: "date", category: "Behavior" },
  { value: "lastOrderAt", label: "Last Order Date", type: "date", category: "Behavior" },
  { value: "lastDeliveredAt", label: "Last Delivered", type: "date", category: "Behavior" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  select: [
    { value: "eq", label: "is" },
    { value: "ne", label: "is not" },
  ],
  text: [
    { value: "eq", label: "equals" },
    { value: "ne", label: "not equals" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "ne", label: "â‰ " },
    { value: "gt", label: ">" },
    { value: "gte", label: "â‰¥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "â‰¤" },
  ],
  date: [
    { value: "gt", label: "after" },
    { value: "gte", label: "on or after" },
    { value: "lt", label: "before" },
    { value: "lte", label: "on or before" },
  ],
};

// â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getFieldDef(fieldValue: string): FieldDef | undefined {
  return FIELD_DEFINITIONS.find((f) => f.value === fieldValue);
}

function countRules(group: RuleGroup): number {
  return group.rules.reduce((acc, item) => {
    if (isRuleGroup(item)) return acc + countRules(item);
    return acc + 1;
  }, 0);
}

function describeRule(rule: Rule): string {
  const field = getFieldDef(rule.field);
  const ops = OPERATORS[field?.type || "number"] || OPERATORS.number;
  const op = ops.find((o) => o.value === rule.op);
  return `${field?.label || rule.field} ${op?.label || rule.op} ${rule.value || "?"}`;
}

// â”€â”€ Default group factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function createDefaultGroup(): RuleGroup {
  return {
    operator: "AND",
    rules: [{ field: "role", op: "eq", value: "CUSTOMER" }],
  };
}

// â”€â”€ Rule Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RuleRow({
  rule,
  onUpdate,
  onRemove,
  showConnector,
  connectorLabel,
}: {
  rule: Rule;
  onUpdate: (updated: Rule) => void;
  onRemove: () => void;
  showConnector: boolean;
  connectorLabel: string;
}) {
  const fieldDef = getFieldDef(rule.field);
  const operators = OPERATORS[fieldDef?.type || "number"] || OPERATORS.number;

  // Group fields by category
  const categories = useMemo(() => {
    const cats = new Map<string, FieldDef[]>();
    FIELD_DEFINITIONS.forEach((f) => {
      const cat = f.category || "Other";
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(f);
    });
    return cats;
  }, []);

  return (
    <div className="flex items-center gap-0">
      {/* Connector label */}
      {showConnector && (
        <div className="w-12 flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
            {connectorLabel}
          </span>
        </div>
      )}
      {!showConnector && <div className="w-12 flex-shrink-0" />}

      <div className="flex items-center gap-2 flex-1 bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2 hover:border-[#333] transition-colors group">
        {/* Drag handle */}
        <GripVertical size={14} className="text-zinc-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

        {/* Field select with optgroups */}
        <select
          value={rule.field}
          onChange={(e) =>
            onUpdate({
              field: e.target.value,
              op: OPERATORS[getFieldDef(e.target.value)?.type || "number"]?.[0]?.value || "eq",
              value: "",
            })
          }
          className="bg-transparent border-0 text-neutral-200 text-sm focus:outline-none cursor-pointer min-w-[140px]"
        >
          {Array.from(categories.entries()).map(([cat, fields]) => (
            <optgroup key={cat} label={cat}>
              {fields.map((f) => (
                <option key={f.value} value={f.value} className="bg-[#1a1a1a]">
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Operator */}
        <select
          value={rule.op}
          onChange={(e) => onUpdate({ ...rule, op: e.target.value })}
          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-zinc-400 text-xs focus:outline-none focus:border-violet-600 min-w-[70px]"
        >
          {operators.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#1a1a1a]">
              {o.label}
            </option>
          ))}
        </select>

        {/* Value input */}
        {fieldDef?.type === "select" ? (
          <select
            value={rule.value}
            onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-zinc-400 text-sm focus:outline-none focus:border-violet-600 min-w-[130px]"
          >
            <option value="" className="bg-[#1a1a1a]">Select...</option>
            {fieldDef.options?.map((opt) => (
              <option key={opt} value={opt} className="bg-[#1a1a1a]">
                {opt.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={fieldDef?.type === "date" ? "date" : fieldDef?.type === "number" ? "number" : "text"}
            value={rule.value}
            onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
            placeholder={fieldDef?.type === "number" ? "0" : fieldDef?.type === "date" ? "YYYY-MM-DD" : "value..."}
            className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-zinc-400 text-sm focus:outline-none focus:border-violet-600 w-[130px] placeholder:text-zinc-600"
          />
        )}

        {/* Remove */}
        <button
          onClick={onRemove}
          className="ml-auto p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Remove rule"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// â”€â”€ Rule Group â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RuleGroupBuilder({
  group,
  onUpdate,
  onRemove,
  depth = 0,
}: {
  group: RuleGroup;
  onUpdate: (updated: RuleGroup) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const ruleCount = countRules(group);

  const addRule = useCallback(() => {
    onUpdate({
      ...group,
      rules: [...group.rules, { field: "role", op: "eq", value: "" }],
    });
  }, [group, onUpdate]);

  const addGroup = useCallback(() => {
    onUpdate({
      ...group,
      rules: [...group.rules, { operator: "AND", rules: [{ field: "role", op: "eq", value: "" }] }],
    });
  }, [group, onUpdate]);

  const updateItem = useCallback(
    (index: number, updated: Rule | RuleGroup) => {
      const newRules = [...group.rules];
      newRules[index] = updated;
      onUpdate({ ...group, rules: newRules });
    },
    [group, onUpdate],
  );

  const removeItem = useCallback(
    (index: number) => {
      onUpdate({ ...group, rules: group.rules.filter((_, i) => i !== index) });
    },
    [group, onUpdate],
  );

  const toggleOperator = useCallback(() => {
    onUpdate({ ...group, operator: group.operator === "AND" ? "OR" : "AND" });
  }, [group, onUpdate]);

  // Colors per depth
  const borderColors = ["border-violet-800/40", "border-orange-800/40", "border-purple-800/40"];
  const bgColors = ["bg-[#0a1015]", "bg-[#15100a]", "bg-[#100a15]"];
  const borderColor = borderColors[depth % borderColors.length];
  const bgColor = bgColors[depth % bgColors.length];

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} ${depth > 0 ? "ml-12" : ""}`}>
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1f1f1f]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          onClick={toggleOperator}
          className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide transition-colors ${
            group.operator === "AND"
              ? "bg-violet-900/60 text-cyan-300 hover:bg-violet-900/80 border border-violet-700/30"
              : "bg-orange-900/60 text-orange-300 hover:bg-orange-900/80 border border-orange-700/30"
          }`}
        >
          {group.operator}
        </button>

        <span className="text-zinc-600 text-xs">
          {group.operator === "AND" ? "All conditions must match" : "Any condition can match"}
        </span>

        <span className="text-zinc-600 text-[10px] ml-1">
          ({ruleCount} {ruleCount === 1 ? "rule" : "rules"})
        </span>

        <div className="flex-1" />

        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
            title="Remove group"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Rules */}
      {!collapsed && (
        <div className="p-3 space-y-1.5">
          {group.rules.map((item, index) =>
            isRuleGroup(item) ? (
              <RuleGroupBuilder
                key={index}
                group={item}
                onUpdate={(updated) => updateItem(index, updated)}
                onRemove={() => removeItem(index)}
                depth={depth + 1}
              />
            ) : (
              <RuleRow
                key={index}
                rule={item}
                onUpdate={(updated) => updateItem(index, updated)}
                onRemove={() => removeItem(index)}
                showConnector={index > 0}
                connectorLabel={group.operator}
              />
            ),
          )}

          {/* Add buttons */}
          <div className="flex items-center gap-3 pt-1.5 pl-12">
            <button
              onClick={addRule}
              className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400 transition-colors font-medium"
            >
              <span className="text-base leading-none">+</span> Add condition
            </button>
            {depth < 2 && (
              <button
                onClick={addGroup}
                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition-colors font-medium"
              >
                <span className="text-base leading-none">+</span> Add group
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsed summary */}
      {collapsed && (
        <div className="px-3 py-2">
          <div className="text-xs text-zinc-600 truncate">
            {group.rules
              .slice(0, 3)
              .map((item, i) => {
                if (isRuleGroup(item)) return `(${countRules(item)} rules)`;
                return describeRule(item);
              })
              .join(` ${group.operator} `)}
            {group.rules.length > 3 && ` +${group.rules.length - 3} more`}
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Main Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface QueryBuilderProps {
  value: RuleGroup;
  onChange: (value: RuleGroup) => void;
  className?: string;
}

export default function QueryBuilder({ value, onChange, className = "" }: QueryBuilderProps) {
  return (
    <div className={className}>
      <RuleGroupBuilder group={value} onUpdate={onChange} />
    </div>
  );
}
