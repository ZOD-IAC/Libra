import React from 'react';
import { View } from 'react-native';
import { Copy, Toggle } from '../ui/primitives';
import type { Product } from '../domain/schema';
export function ProductSelector({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {products.length ? (
        products.map((p) => (
          <Toggle
            key={p.id}
            label={p.name}
            value={value.includes(p.id)}
            onChange={(checked) =>
              onChange(checked ? [...value, p.id] : value.filter((id) => id !== p.id))
            }
          />
        ))
      ) : (
        <Copy muted size={13}>
          No products defined. Add products in Plan → Products I use.
        </Copy>
      )}
    </View>
  );
}
