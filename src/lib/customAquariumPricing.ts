import {
  BackingColor,
  CustomAquariumAddonItem,
  CustomAquariumPriceBreakdown,
  CustomAquariumPricingConfig,
  FiltrationPreset,
  GlassFinish,
  LightingPreset,
  LivestockStarter,
  PlumbingKit,
  PlantsLevel,
  RockHardscape,
  StandMaterial,
  SubstrateOption,
  TankShape,
} from '../types';

export interface CustomAquariumSelectionInput {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  glassThicknessMm: number;
  shape: TankShape;
  glassFinish: GlassFinish;
  backingColor: BackingColor;
  stand: StandMaterial;
  lighting: LightingPreset;
  filtration: FiltrationPreset;
  substrate: SubstrateOption;
  plants: PlantsLevel;
  hardscape: RockHardscape;
  livestock: LivestockStarter;
  plumbingKit: PlumbingKit;
  addons: CustomAquariumAddonItem[];
}

export function calculateTankLiters(lengthCm: number, widthCm: number, heightCm: number): number {
  const l = Math.max(20, lengthCm);
  const w = Math.max(20, widthCm);
  const h = Math.max(20, heightCm);
  return Math.round((l * w * h) / 1000);
}

export function calculateCustomAquariumPricing(
  input: CustomAquariumSelectionInput,
  config: CustomAquariumPricingConfig
): CustomAquariumPriceBreakdown {
  const liters = calculateTankLiters(input.lengthCm, input.widthCm, input.heightCm);
  const thicknessMult =
    config.glassThicknessMultipliers[String(input.glassThicknessMm)] ?? 1;

  const baseTankPrice = Math.round(
    config.baseAssemblyFee + liters * config.pricePerLiter * thicknessMult
  );

  const customizationCharges = Math.round(
    (config.shapeFees[input.shape] ?? 0) +
      (config.finishFees[input.glassFinish] ?? 0) +
      (config.backingFees[input.backingColor] ?? 0)
  );

  const selectedAccessoriesCost = Math.round(
    (config.standFees[input.stand] ?? 0) +
      (config.lightingFees[input.lighting] ?? 0) +
      (config.filtrationFees[input.filtration] ?? 0) +
      (config.substrateFees[input.substrate] ?? 0) +
      (config.plantsFees[input.plants] ?? 0) +
      (config.hardscapeFees[input.hardscape] ?? 0) +
      (config.livestockFees[input.livestock] ?? 0) +
      (config.plumbingFees[input.plumbingKit] ?? 0)
  );

  const addonsTotal = Math.round(
    input.addons.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  const aquariumTotalBeforeDelivery =
    baseTankPrice + customizationCharges + selectedAccessoriesCost + addonsTotal;

  return {
    baseTankPrice,
    customizationCharges,
    selectedAccessoriesCost,
    addonsTotal,
    aquariumTotalBeforeDelivery,
    liters,
  };
}
