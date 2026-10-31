/**
 * Retrieval benchmark for the HS search tool: natural product names with the HS-2022 subheading a customs broker would expect.
 * Labels were written by hand. Some products have more than one defensible subheading (e.g. shrimps 0306.16 / 0306.17),
 * so the numbers below measure retrieval of the expected code, not legal correctness.
 *
 * TUNING is the set the search was tuned on (synonyms were added for its misses). HOLDOUT was first run untuned:
 * baseline top-1 15/27 and top-5 21/27, and then used for tuning as well, so its current numbers are optimistic.
 */
export type Case = [query: string, hs: string];

export const TUNING: Case[] = [
  ["20 tonnes of fresh bananas", "0803.90"], ["50t green coffee beans", "0901.11"], ["cocoa beans", "1801.00"], ["raw cotton", "5201.00"],
  ["refined copper cathodes", "7403.11"], ["aluminium ingots unwrought", "7601.10"], ["wheat", "1001.99"], ["yellow maize", "1005.90"],
  ["milled rice", "1006.30"], ["raw cane sugar", "1701.14"], ["cashew nuts in shell", "0801.31"], ["solar panels", "8541.43"],
  ["smartphones", "8517.13"], ["lithium-ion batteries", "8507.60"], ["excavators", "8429.52"], ["portland cement", "2523.29"],
  ["crude oil", "2709.00"], ["urea fertilizer", "3102.10"], ["iron ore", "2601.11"], ["rebar steel bars", "7214.20"],
  ["laptops", "8471.30"], ["car tyres", "4011.10"], ["frozen shrimps", "0306.17"], ["cotton t-shirts", "6109.10"],
  ["refrigerators", "8418.10"], ["washing machines", "8450.11"], ["television sets", "8528.72"], ["sesame seeds", "1207.40"],
  ["shelled groundnuts", "1202.42"], ["crude palm oil", "1511.10"], ["milk powder", "0402.21"], ["sweet biscuits", "1905.31"],
  ["frozen chicken cuts", "0207.14"], ["bituminous coal", "2701.12"], ["gold bars unwrought", "7108.12"], ["medicaments for retail sale", "3004.90"],
  ["wooden furniture", "9403.60"], ["cement clinker", "2523.10"], ["men's cotton trousers", "6203.42"], ["NPK fertilizer", "3105.20"],
];

export const HOLDOUT: Case[] = [
  ["fresh pineapples", "0804.30"], ["avocados", "0804.40"], ["fresh mangoes", "0804.50"], ["onions", "0703.10"], ["potatoes", "0701.90"],
  ["soybeans", "1201.90"], ["natural honey", "0409.00"], ["salt", "2501.00"], ["sulphur", "2503.00"], ["bicycles", "8712.00"],
  ["rough diamonds", "7102.31"], ["liquefied natural gas", "2711.11"], ["propane", "2711.12"], ["ginger", "0910.11"], ["black pepper", "0904.11"],
  ["vanilla beans", "0905.10"], ["cloves", "0907.10"], ["fresh coconuts", "0801.19"], ["fresh apples", "0808.10"], ["fresh oranges", "0805.10"],
  ["bottled mineral water", "2201.10"], ["toilet soap bars", "3401.11"], ["toothpaste", "3306.10"], ["whisky", "2208.30"], ["beer made from malt", "2203.00"],
  ["cigarettes", "2402.20"], ["glass bottles", "7010.90"],
];
