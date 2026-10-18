"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Trash2, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createQuotationAction } from "@/lib/operations/actions";

interface CustomerOption {
  id: string;
  name: string;
}

interface CreateQuotationDialogProps {
  tenantSlug: string;
  customers: CustomerOption[];
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function CreateQuotationDialog({
  tenantSlug,
  customers,
}: CreateQuotationDialogProps) {
  const t = useTranslations("Operations.createQuotation");
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0 },
  ]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: "description" | "quantity" | "unitPrice",
    val: string | number
  ) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const total = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(
      (it) => it.description.trim() && it.quantity > 0
    );

    if (validItems.length === 0 || !customerId) {
      toast.error(t("fillRequiredFields"));
      return;
    }

    startTransition(async () => {
      const res = await createQuotationAction({
        tenantSlug,
        customerId,
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
        locale,
      });

      if (res.success) {
        toast.success(t("createdSuccess"));
        setIsOpen(false);
        setItems([{ id: "1", description: "", quantity: 1, unitPrice: 0 }]);
      } else {
        toast.error(res.error || t("createdError"));
      }
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        variant="outline"
        className="gap-1.5 text-xs font-semibold shadow-xs"
      >
        <Plus className="size-3.5" />
        {t("button")}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{t("title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Customer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {t("customerLabel")} *
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {t("lineItemsLabel")} *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Plus className="size-3" />
                    {t("addItem")}
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center rounded-xl border border-border/60 bg-muted/20 p-2 text-xs"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder={t("itemDescPlaceholder")}
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(item.id, "description", e.target.value)
                          }
                          className="w-full rounded-lg border border-input bg-background p-2 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder={t("qty")}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-input bg-background p-2 text-xs text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder={t("price")}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "unitPrice",
                              Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-input bg-background p-2 text-xs text-center"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          disabled={items.length <= 1}
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs">
                <span className="font-semibold text-muted-foreground">
                  {t("totalQuotation")}
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !customerId}
                  className="gap-1.5 font-semibold"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  {t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
