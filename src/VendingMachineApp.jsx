import React, { useState, useMemo } from "react";

// Single-file React component (Tailwind CSS assumed in project)
// Drop this file into a React + Tailwind project (Vite/CRA) and render <VendingMachineApp />

const PRODUCTS = [
  { id: "A1", name: "Sparkling Water", priceCents: 120, stock: 5 },
  { id: "A2", name: "Cola", priceCents: 150, stock: 5 },
  { id: "A3", name: "Orange Juice", priceCents: 180, stock: 3 },
  { id: "B1", name: "Energy Drink", priceCents: 250, stock: 2 },
  { id: "B2", name: "Iced Tea", priceCents: 130, stock: 4 },
];

const COIN_DENOMS = [200, 100, 50, 20, 10]; // cents

function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function VendingMachineApp() {
  const [products, setProducts] = useState(PRODUCTS.map(p => ({ ...p })));
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [insertedCoins, setInsertedCoins] = useState([]); // array of cents
  const [message, setMessage] = useState("Welcome! Select a product or insert coins.");

  // Machine coin inventory (for giving change)
  const [coinInventory, setCoinInventory] = useState({ 200: 5, 100: 10, 50: 10, 20: 20, 10: 50 });

  const totalInserted = useMemo(() => insertedCoins.reduce((s, c) => s + c, 0), [insertedCoins]);

  function selectProduct(id) {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    setMessage(`${prod.name} selected (${formatCurrency(prod.priceCents)})`);
  }

  function insertCoin(value) {
    setInsertedCoins(prev => [...prev, value]);
    setMessage(`Inserted ${formatCurrency(value)} — Total ${formatCurrency(totalInserted + value)}`);
  }

  function cancelTransaction() {
    if (insertedCoins.length === 0) {
      setMessage("Nothing to cancel.");
      return;
    }
    const returned = [...insertedCoins];
    setInsertedCoins([]);
    setMessage(`Transaction cancelled — returned ${returned.length} coin(s): ${returned.map(c => formatCurrency(c)).join(", ")}`);
  }

  // Greedy change algorithm that respects coin inventory. Returns object { success, change, remainingInventory }
  function calculateChange(amountCents, inventory) {
    let remaining = { ...inventory };
    const change = {};
    for (let coin of COIN_DENOMS) {
      change[coin] = 0;
      while (amountCents >= coin && remaining[coin] > 0) {
        amountCents -= coin;
        remaining[coin] -= 1;
        change[coin] += 1;
      }
    }
    if (amountCents === 0) return { success: true, change, remaining };
    return { success: false };
  }

  function finalizePurchase() {
    if (!selectedProductId) {
      setMessage("No product selected. Please select a product first or insert coins and then select a product.");
      return;
    }
    const prodIndex = products.findIndex(p => p.id === selectedProductId);
    if (prodIndex === -1) return;
    const prod = products[prodIndex];
    if (prod.stock <= 0) {
      setMessage("Selected product is out of stock. Please select another product.");
      return;
    }

    if (totalInserted < prod.priceCents) {
      setMessage(`Insufficient funds. ${formatCurrency(prod.priceCents - totalInserted)} more required.`);
      return;
    }

    const changeNeeded = totalInserted - prod.priceCents;

    // Update coin inventory first with inserted coins
    const newInventory = { ...coinInventory };
    for (let c of insertedCoins) newInventory[c] = (newInventory[c] || 0) + 1;

    // Calculate change from this updated inventory
    const changeResult = calculateChange(changeNeeded, newInventory);
    if (!changeResult.success) {
      setMessage("Cannot dispense exact change with current coin inventory. Please insert exact change or choose another product.");
      return;
    }

    // Commit: reduce product stock, update inventory to changeResult.remaining, clear inserted coins, give change
    const updatedProducts = [...products];
    updatedProducts[prodIndex] = { ...prod, stock: prod.stock - 1 };
    setProducts(updatedProducts);
    setCoinInventory(changeResult.remaining);

    // Prepare user-facing change array
    const changeList = [];
    for (let den of COIN_DENOMS) {
      const count = changeResult.change[den] || 0;
      for (let i = 0; i < count; i++) changeList.push(den);
    }

    setInsertedCoins([]);
    setSelectedProductId(null);

    setMessage(
      `Dispensed ${prod.name}. ${
        changeList.length ? `Change returned: ${changeList.map(c => formatCurrency(c)).join(", ")}` : "No change"
      }`
    );
  }

  // Quick helpers to adjust coin inventory (for testing scenarios)
  function setCoinCount(denom, count) {
    setCoinInventory(prev => ({ ...prev, [denom]: Math.max(0, Number(count) || 0) }));
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Machine UI */}
        <div className="col-span-2 bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold mb-2">Vending Machine — QA Exercise</h1>
          <p className="text-sm text-gray-600 mb-4">Select a product, insert coins, then press Purchase. You can also cancel.</p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => selectProduct(p.id)}
                className={`p-3 rounded-lg border ${selectedProductId === p.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white"} flex flex-col items-start`}
                aria-pressed={selectedProductId === p.id}
              >
                <div className="text-xs text-gray-500">{p.id}</div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-700">{formatCurrency(p.priceCents)}</div>
                <div className="text-xs text-gray-400 mt-1">Stock: {p.stock}</div>
              </button>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">Screen</div>
              <div className="mt-2 p-3 rounded-lg bg-black text-white min-h-[56px] flex items-center">{message}</div>
            </div>

            <div className="w-64">
              <div className="text-sm font-medium text-gray-700">Inserted</div>
              <div className="mt-2 p-3 rounded-lg bg-gray-50 text-gray-900">
                <div className="text-lg font-semibold">{formatCurrency(totalInserted)}</div>
                <div className="text-xs text-gray-500">{insertedCoins.length} coin(s)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {insertedCoins.map((c, i) => (
                    <div key={i} className="px-2 py-1 bg-white rounded border text-sm">{formatCurrency(c)}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700">Insert Coin</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {COIN_DENOMS.map(d => (
                <button key={d} onClick={() => insertCoin(d)} className="px-3 py-2 rounded bg-yellow-100 border">
                  {formatCurrency(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={finalizePurchase} className="flex-1 py-2 rounded bg-indigo-600 text-white font-semibold">Purchase</button>
            <button onClick={cancelTransaction} className="py-2 px-4 rounded border">Cancel</button>
            <button
              onClick={() => {
                // quick reset for demo
                setProducts(PRODUCTS.map(p => ({ ...p })));
                setCoinInventory({ 200: 5, 100: 10, 50: 10, 20: 20, 10: 50 });
                setInsertedCoins([]);
                setSelectedProductId(null);
                setMessage("Machine reset — Welcome!");
              }}
              className="py-2 px-4 rounded border"
            >
              Reset
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <strong>Notes for candidate:</strong> This machine accepts coins, dispenses change, and allows selecting product before or after inserting money. Test for boundary prices, change shortages, cancel/return, and stock depletion. (This is part of the exercise — no answers included.)
          </div>
        </div>

        {/* Right: Testing Controls & Inventory */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold mb-2">Controls & Test Tools</h2>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700">Coin Inventory (machine)</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {COIN_DENOMS.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <div className="w-20 text-gray-700">{formatCurrency(d)}</div>
                  <input
                    type="number"
                    value={coinInventory[d] ?? 0}
                    onChange={e => setCoinCount(d, e.target.value)}
                    className="w-20 p-1 border rounded text-right"
                    min={0}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">Lowering counts simulates change shortages so you can test tricky edge cases.</div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700">Quick scenarios</div>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  // scenario: exact change required -> zero out small coins
                  setCoinInventory({ 200: 5, 100: 10, 50: 0, 20: 0, 10: 0 });
                  setMessage("Scenario: Limited small coins for change — try buying and getting change.");
                }}
                className="py-2 rounded border text-sm"
              >
                Simulate small-coin shortage
              </button>

              <button
                onClick={() => {
                  // scenario: out of stock a product
                  setProducts(prev => prev.map(p => (p.id === "B1" ? { ...p, stock: 0 } : p)));
                  setMessage("Scenario: B1 out of stock. Select it and observe behavior.");
                }}
                className="py-2 rounded border text-sm"
              >
                Simulate out-of-stock (B1)
              </button>

              <button
                onClick={() => {
                  // create low-inventory change situation where greedy fails for some combos
                  setCoinInventory({ 200: 0, 100: 0, 50: 1, 20: 0, 10: 0 });
                  setMessage("Edge scenario: Very low change inventory. Try various purchases.");
                }}
                className="py-2 rounded border text-sm"
              >
                Simulate extreme change shortage
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700">Machine status</div>
            <div className="mt-2 text-sm">
              <div>Products: {products.reduce((s, p) => s + p.stock, 0)} items remaining</div>
              <div>Coins in machine: {Object.values(coinInventory).reduce((s, c) => s + c, 0)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 text-xs text-gray-500">Tip: Try selecting a product before inserting money, then insert coins — or insert coins first and then select product.</div>
    </div>
  );
}
