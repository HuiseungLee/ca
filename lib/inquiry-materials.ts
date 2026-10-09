/** Materials are stored as rows, never with a client-supplied total. */
export const MATERIALS_BUDGET = 200_000;
export const MATERIALS_MAX_ITEMS = 20;

export type MaterialItem = {
  name: string;
  specification: string;
  s2b: string;
  quantity: string;
  unitPrice: string;
  shipping: string;
};

const itemKeys = [
  "name",
  "specification",
  "s2b",
  "quantity",
  "unitPrice",
  "shipping",
] as const;

export function parseMaterials(value: string): MaterialItem[] | null {
  if (!value.trim() || value.length > 12_000) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    if (
      !parsed.every(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          itemKeys.every((key) => typeof item[key] === "string"),
      )
    ) {
      return null;
    }
    // Ignore unrecognized properties (including any stored total).
    return parsed.map((item) => ({
      name: item.name,
      specification: item.specification,
      s2b: item.s2b,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      shipping: item.shipping,
    }));
  } catch {
    return null;
  }
}

function integer(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

/** Invalid or unsafe rows contribute zero; submission validation rejects them. */
export function materialTotal(items: MaterialItem[]): number {
  let total = 0;
  for (const item of items) {
    const quantity = integer(item.quantity);
    const unitPrice = integer(item.unitPrice);
    const shipping = integer(item.shipping);
    if (quantity === null || unitPrice === null || shipping === null) continue;
    const rowTotal = quantity * unitPrice + shipping;
    if (!Number.isSafeInteger(rowTotal)) continue;
    if (!Number.isSafeInteger(total + rowTotal)) return Number.MAX_SAFE_INTEGER;
    total += rowTotal;
  }
  return total;
}

export function materialAnswerError(value: string): string | undefined {
  // Whether this answer is required is decided by the containing question.
  if (!value.trim()) return undefined;
  if (value.length > 12_000)
    return "물품 신청 내용은 12,000자 이내로 작성해 주세요.";
  const items = parseMaterials(value);
  if (!items) return "물품 정보를 표 양식으로 다시 작성해 주세요.";
  if (items.length > MATERIALS_MAX_ITEMS) {
    return `물품은 최대 ${MATERIALS_MAX_ITEMS}개까지 신청할 수 있습니다.`;
  }
  // An explicit empty list records that no materials are being requested.
  for (const [index, item] of items.entries()) {
    const row = `${index + 1}번 물품`;
    if (!item.name.trim()) return `${row}의 물품명/모델명을 입력해 주세요.`;
    if (item.name.length > 200)
      return `${row}의 물품명/모델명은 200자 이내로 입력해 주세요.`;
    if (!item.specification.trim()) return `${row}의 규격을 입력해 주세요.`;
    if (item.specification.length > 200)
      return `${row}의 규격은 200자 이내로 입력해 주세요.`;
    if (item.s2b.length > 100)
      return `${row}의 S2B 물품번호는 100자 이내로 입력해 주세요.`;
    const quantity = integer(item.quantity);
    if (quantity === null || quantity < 1 || quantity > 999) {
      return `${row}의 수량은 1~999 사이의 정수로 입력해 주세요.`;
    }
    const unitPrice = integer(item.unitPrice);
    if (unitPrice === null || unitPrice > MATERIALS_BUDGET) {
      return `${row}의 단가는 0~200,000원 사이의 정수로 입력해 주세요.`;
    }
    const shipping = integer(item.shipping);
    if (shipping === null || shipping > MATERIALS_BUDGET) {
      return `${row}의 배송비는 0~200,000원 사이의 정수로 입력해 주세요. 무료 배송은 0원입니다.`;
    }
  }
  if (materialTotal(items) > MATERIALS_BUDGET) {
    return "배송비를 포함한 총 신청 금액은 200,000원을 초과할 수 없습니다.";
  }
  return undefined;
}
