import { useLoaderData } from "@tanstack/react-router";
import { isPlaceholderPhone } from "@/lib/campus";

/**
 * The campus security line for call buttons, as loaded by the root route from
 * server settings (SECURITY_LINE_PHONE). `placeholder` is true until the real
 * number is configured.
 */
export function useSecurityLine() {
  const line = useLoaderData({ from: "__root__" });
  return {
    label: line.label,
    phone: line.phone,
    tel: `tel:${line.phone.replace(/[^\d+]/g, "")}`,
    placeholder: isPlaceholderPhone(line.phone),
  };
}
