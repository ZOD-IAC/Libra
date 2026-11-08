import React, { useState } from 'react';
import { View, Linking } from 'react-native';
import { router, Redirect, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Heading,
  Copy,
  Field,
  Button,
  Panel,
  SectionTitle,
  IconButton,
} from '../src/ui/primitives';
import { useApp, attempt } from '../src/state/app';
export default function Products() {
  const { repo } = useApp(),
    p = repo.active(),
    { id } = useLocalSearchParams<{ id?: string }>(),
    [query, setQuery] = useState('');
  if (!p) return <Redirect href="/" />;
  const selected = id
    ? (p.products.find((product) => product.id === id) ?? repo.product(p.id, id))
    : null;
  const list = p.products.filter((product) =>
    `${product.name} ${product.brand} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Heading
        eyebrow="WHAT YOU ACTUALLY USE"
        title="Your products"
        action={
          <IconButton
            name="plus"
            label="Add product"
            onPress={() => router.push('/edit-product')}
          />
        }
      />
      <Copy muted>
        A separate list from your daily checklist. Products and usage details come from your plan;
        you can also edit them here.
      </Copy>
      {selected ? (
        <Panel>
          <Copy heading size={27}>
            {selected.name}
          </Copy>
          {selected.brand !== '' ? <Copy muted>{selected.brand}</Copy> : null}
          {selected.category !== '' ? (
            <Copy size={12} muted>
              {selected.category}
            </Copy>
          ) : null}
          {selected.description !== '' ? <Copy>{selected.description}</Copy> : null}
          {selected.usageNotes !== '' ? (
            <>
              <Copy heading size={21}>
                Your usage notes
              </Copy>
              <Copy muted>{selected.usageNotes}</Copy>
            </>
          ) : null}
          {selected.url ? (
            <Button
              title="Open product link in browser"
              kind="soft"
              onPress={() => attempt(() => Linking.openURL(selected.url!))}
            />
          ) : null}
          {p.products.some((product) => product.id === id) ? (
            <Button
              title="Edit product"
              kind="soft"
              onPress={() =>
                router.push({ pathname: '/edit-product', params: { id: selected.id } })
              }
            />
          ) : (
            <Copy muted>This product is from a previous plan version.</Copy>
          )}
          <Button
            title="Show all products"
            kind="ghost"
            onPress={() => router.replace('/products')}
          />
        </Panel>
      ) : null}
      <Field label="Search your products" value={query} onChangeText={setQuery} />
      {list.map((product) => (
        <Panel key={product.id}>
          <SectionTitle title={product.name} />
          {product.brand !== '' ? <Copy muted>{product.brand}</Copy> : null}
          {product.description !== '' ? (
            <Copy size={13} muted>
              {product.description}
            </Copy>
          ) : null}
          <Button
            title="Details & usage"
            kind="soft"
            onPress={() => router.push({ pathname: '/products', params: { id: product.id } })}
          />
          <Copy size={12} muted>
            {p.activities
              .filter(
                (a) =>
                  a.productIds.includes(product.id) ||
                  a.steps.some((s) => s.productIds.includes(product.id)),
              )
              .map((a) => a.title)
              .join(' · ') || 'Not linked to an activity yet'}
          </Copy>
        </Panel>
      ))}
      {!list.length ? (
        <Copy muted>No matching products. Add one or import a plan containing products.</Copy>
      ) : null}
      <Button title="Back" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
