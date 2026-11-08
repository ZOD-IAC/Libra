import React, { useState } from 'react';
import { Alert } from 'react-native';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import { Screen, Heading, Field, Button, Copy } from '../src/ui/primitives';
import { useApp, attempt } from '../src/state/app';
import { productSchema, type Product } from '../src/domain/schema';
export default function EditProduct() {
  const { repo, refresh } = useApp(),
    p = repo.active(),
    { id } = useLocalSearchParams<{ id?: string }>(),
    existing = p?.products.find((x) => x.id === id),
    [product, setProduct] = useState<Product>(
      existing ?? productSchema.parse({ id: `product-${Date.now()}`, name: 'New product' }),
    );
  if (!p) return <Redirect href="/" />;
  const patch = (value: Partial<Product>) => setProduct((v) => ({ ...v, ...value }));
  return (
    <Screen>
      <Heading title={existing ? 'Edit product' : 'Add product'} />
      <Field label="Product name" value={product.name} onChangeText={(name) => patch({ name })} />
      <Field
        label="Brand (optional)"
        value={product.brand}
        onChangeText={(brand) => patch({ brand })}
      />
      <Field
        label="Category (optional)"
        value={product.category}
        onChangeText={(category) => patch({ category })}
      />
      <Field
        label="Product details"
        value={product.description}
        onChangeText={(description) => patch({ description })}
        multiline
      />
      <Field
        label="How you use it"
        value={product.usageNotes}
        onChangeText={(usageNotes) => patch({ usageNotes })}
        multiline
      />
      <Field
        label="HTTPS link (optional)"
        value={product.url ?? ''}
        onChangeText={(url) => patch({ url: url || undefined })}
      />
      <Copy muted size={12}>
        Use your own product and established instructions. The app does not prescribe products or
        treatments.
      </Copy>
      <Button
        title="Save product"
        onPress={() =>
          attempt(() => {
            repo.apply({
              ...p,
              version: p.version + 1,
              products: existing
                ? p.products.map((x) => (x.id === product.id ? product : x))
                : [...p.products, product],
            });
            refresh();
            router.back();
          })
        }
      />
      {existing ? (
        <Button
          title="Remove product from current plan"
          kind="danger"
          onPress={() =>
            Alert.alert(
              'Remove product?',
              'Current task links will be removed. Previously tracked task snapshots and product details remain in history.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () =>
                    attempt(() => {
                      repo.apply({
                        ...p,
                        version: p.version + 1,
                        products: p.products.filter((x) => x.id !== product.id),
                        activities: p.activities.map((a) => ({
                          ...a,
                          productIds: a.productIds.filter((x) => x !== product.id),
                          steps: a.steps.map((s) => ({
                            ...s,
                            productIds: s.productIds.filter((x) => x !== product.id),
                          })),
                        })),
                      });
                      refresh();
                      router.back();
                    }),
                },
              ],
            )
          }
        />
      ) : null}
      <Button title="Cancel" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
