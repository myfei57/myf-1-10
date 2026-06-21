import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Store,
  Part,
  PartType,
  Rarity,
  Robot,
  MissionRecord,
  RepairRecord,
  AssemblyPlan,
  GameConfig,
  ResonanceCombo,
  ResonanceBonus,
  ResonanceRecord,
} from '../types';
import {
  DEFAULT_CONFIG,
  MISSIONS,
  INITIAL_CREDITS,
  INITIAL_MATERIALS,
  BLIND_BOX_PRICES,
  RESONANCE_COMBOS,
  RESONANCE_MAX_SLOTS,
} from '../data/defaultConfig';
import {
  generateId,
  generateRandomPart,
  calculateRobotStats as calcStats,
  calculateAdaptability as calcAdapt,
  clamp,
} from '../utils/helpers';

const EMPTY_SELECTED_PARTS: Record<PartType, Part | null> = {
  head: null,
  body: null,
  arm: null,
  leg: null,
  core: null,
  tool: null,
};

const EMPTY_RESONANCE_SLOTS: (Part | null)[] = Array(RESONANCE_MAX_SLOTS).fill(null);

function checkResonanceConditionImpl(parts: Part[], combo: ResonanceCombo): boolean {
  const validParts = parts.filter(Boolean);
  const { condition } = combo;

  if (condition.minPartCount && validParts.length < condition.minPartCount) {
    return false;
  }

  if (condition.partNames && condition.partNames.length > 0) {
    const partNameSet = new Set(validParts.map((p) => p.name));
    const hasAllNames = condition.partNames.every((name) => partNameSet.has(name));
    if (!hasAllNames) return false;
  }

  if (condition.partTypes && condition.partTypes.length > 0) {
    const partTypeSet = new Set(validParts.map((p) => p.type));
    const hasAllTypes = condition.partTypes.every((t) => partTypeSet.has(t));
    if (!hasAllTypes) return false;
  }

  if (condition.rarities && condition.rarities.length > 0) {
    const raritySet = new Set(validParts.map((p) => p.rarity));
    const count = validParts.filter((p) => condition.rarities!.includes(p.rarity)).length;
    const minCount = Math.min(condition.rarities.length, validParts.length);
    if (count < minCount) return false;
  }

  if (condition.setBonuses && condition.setBonuses.length > 0) {
    const setBonusCounts: Record<string, number> = {};
    validParts.forEach((p) => {
      if (p.setBonus) {
        setBonusCounts[p.setBonus] = (setBonusCounts[p.setBonus] || 0) + 1;
      }
    });
    for (const requiredSet of condition.setBonuses) {
      const requiredCount = Math.ceil(validParts.length * 0.5);
      if ((setBonusCounts[requiredSet] || 0) < Math.max(2, requiredCount)) {
        const hasSet = validParts.filter((p) => p.setBonus === requiredSet).length;
        if (hasSet < 2) return false;
      }
    }
  }

  const totalWeight = validParts.reduce((s, p) => s + p.weight, 0);
  const totalEnergy = validParts.reduce((s, p) => s + p.energy, 0);
  const totalSkill = validParts.reduce((s, p) => s + p.skillSlots, 0);

  if (condition.maxEnergy !== undefined && totalEnergy > condition.maxEnergy) {
    return false;
  }
  if (condition.minWeight !== undefined && totalWeight < condition.minWeight) {
    return false;
  }
  if (condition.minSkillSlots !== undefined && totalSkill < condition.minSkillSlots) {
    return false;
  }

  if (condition.requireFullCompatibility) {
    for (let i = 0; i < validParts.length; i++) {
      for (let j = i + 1; j < validParts.length; j++) {
        const a = validParts[i];
        const b = validParts[j];
        if (!a.compatibility.includes(b.type) || !b.compatibility.includes(a.type)) {
          return false;
        }
      }
    }
  }

  return true;
}

export const useGameStore = create<Store>()(
  persist(
    (set, get) => ({
      parts: [],
      robots: [],
      credits: INITIAL_CREDITS,
      materials: INITIAL_MATERIALS,
      missionRecords: [],
      repairRecords: [],
      assemblyPlans: [],
      config: DEFAULT_CONFIG,
      selectedParts: { ...EMPTY_SELECTED_PARTS },
      resonanceSlots: [...EMPTY_RESONANCE_SLOTS],
      unlockedResonances: [],
      activeResonances: [],
      resonanceRecords: [],
      resonanceMaxSlots: RESONANCE_MAX_SLOTS,

      addPart: (part) => set((state) => ({ parts: [...state.parts, part] })),

      removePart: (partId) =>
        set((state) => ({
          parts: state.parts.filter((p) => p.id !== partId),
        })),

      updatePart: (partId, updates) =>
        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === partId ? { ...p, ...updates } : p
          ),
        })),

      addRobot: (robot) => set((state) => ({ robots: [...state.robots, robot] })),

      removeRobot: (robotId) =>
        set((state) => ({
          robots: state.robots.filter((r) => r.id !== robotId),
        })),

      updateRobot: (robotId, updates) =>
        set((state) => ({
          robots: state.robots.map((r) =>
            r.id === robotId ? { ...r, ...updates } : r
          ),
        })),

      addCredits: (amount) =>
        set((state) => ({ credits: state.credits + amount })),

      spendCredits: (amount) => {
        const state = get();
        if (state.credits >= amount) {
          set({ credits: state.credits - amount });
          return true;
        }
        return false;
      },

      addMaterials: (amount) =>
        set((state) => ({ materials: state.materials + amount })),

      spendMaterials: (amount) => {
        const state = get();
        if (state.materials >= amount) {
          set({ materials: state.materials - amount });
          return true;
        }
        return false;
      },

      addMissionRecord: (record) =>
        set((state) => ({ missionRecords: [...state.missionRecords, record] })),

      addRepairRecord: (record) =>
        set((state) => ({ repairRecords: [...state.repairRecords, record] })),

      addAssemblyPlan: (plan) =>
        set((state) => ({ assemblyPlans: [...state.assemblyPlans, plan] })),

      removeAssemblyPlan: (planId) =>
        set((state) => ({
          assemblyPlans: state.assemblyPlans.filter((p) => p.id !== planId),
        })),

      updateConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      setSelectedPart: (slot, part) =>
        set((state) => ({
          selectedParts: {
            ...state.selectedParts,
            [slot]: part,
          },
        })),

      clearSelectedParts: () => set({ selectedParts: { ...EMPTY_SELECTED_PARTS } }),

      recyclePart: (partId) => {
        const state = get();
        const part = state.parts.find((p) => p.id === partId);
        if (!part) return;

        const recycleRate = state.config.recyclingRates[part.rarity];
        const materialsGained = Math.floor(part.maxDurability * recycleRate);

        set((s) => ({
          parts: s.parts.filter((p) => p.id !== partId),
          materials: s.materials + materialsGained,
        }));
      },

      repairRobot: (robotId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        if (!robot) return { success: false, cost: 0, restored: 0 };

        const { repairRules } = state.config;
        
        if (robot.repairCount >= repairRules.maxRepairs) {
          return { success: false, cost: 0, restored: 0 };
        }

        const durabilityNeeded = robot.maxDurability - robot.durability;
        const cost = durabilityNeeded * repairRules.materialCostPerPoint;

        if (!state.spendMaterials(cost)) {
          return { success: false, cost, restored: 0 };
        }

        const successRate = clamp(
          repairRules.baseSuccessRate - robot.repairCount * repairRules.degradeRate,
          0.1,
          repairRules.baseSuccessRate
        );
        const success = Math.random() < successRate;

        let restored = 0;
        if (success) {
          restored = durabilityNeeded;
          state.updateRobot(robotId, {
            durability: robot.maxDurability,
            repairCount: robot.repairCount + 1,
          });
        } else {
          state.updateRobot(robotId, {
            repairCount: robot.repairCount + 1,
          });
        }

        const record: RepairRecord = {
          id: generateId(),
          robotId: robot.id,
          robotName: robot.name,
          materialCost: cost,
          success,
          durabilityRestored: restored,
          repairedAt: Date.now(),
        };
        state.addRepairRecord(record);

        return { success, cost, restored };
      },

      executeMission: (robotId, missionId) => {
        const state = get();
        const robot = state.robots.find((r) => r.id === robotId);
        const mission = MISSIONS.find((m) => m.id === missionId);

        if (!robot || !mission) {
          throw new Error('Robot or mission not found');
        }

        const adaptability = state.calculateAdaptability(robot, mission);
        const successChance = clamp(adaptability / 100, 0.1, 0.95);
        const success = Math.random() < successChance;

        let durabilityLoss = Math.floor(mission.difficulty * 5 * Math.random() + 5);
        if (robot.isOverloaded) {
          durabilityLoss += state.config.overloadRules.durabilityPenalty;
        }

        const newDurability = clamp(robot.durability - durabilityLoss, 0, robot.maxDurability);
        state.updateRobot(robotId, { durability: newDurability });

        let rewards = { credits: 0, materials: 0 };
        if (success) {
          rewards = {
            credits: mission.rewards.credits,
            materials: mission.rewards.materials,
          };
          state.addCredits(rewards.credits);
          state.addMaterials(rewards.materials);

          if (mission.rewards.blindBox) {
            const bonusParts = state.openBlindBox(mission.rewards.blindBox, true);
            bonusParts.forEach((p) => state.addPart(p));
          }
        }

        const record: MissionRecord = {
          id: generateId(),
          robotId: robot.id,
          robotName: robot.name,
          missionId: mission.id,
          missionName: mission.name,
          success,
          adaptability,
          rewards,
          durabilityLoss,
          completedAt: Date.now(),
        };
        state.addMissionRecord(record);

        return record;
      },

      calculateRobotStats: (parts) => {
        const state = get();
        return calcStats(parts, state.config);
      },

      calculateAdaptability: (robot, mission) => {
        const state = get();
        return calcAdapt(robot, mission, state.config);
      },

      generateRandomPart: (minRarity) => {
        const state = get();
        return generateRandomPart(state.config, minRarity);
      },

      openBlindBox: (type, free = false) => {
        const state = get();
        const price = BLIND_BOX_PRICES[type];

        if (!free && !state.spendCredits(price)) {
          return [];
        }

        const parts: Part[] = [];
        const count = type === 'legendary' ? 5 : type === 'epic' ? 4 : type === 'rare' ? 3 : 2;

        for (let i = 0; i < count; i++) {
          const part = generateRandomPart(state.config, type);
          parts.push(part);
        }

        return parts;
      },

      placeResonancePart: (slotIndex, part) =>
        set((state) => {
          const newSlots = [...state.resonanceSlots];
          const oldPart = newSlots[slotIndex];

          if (part) {
            const existingIndex = newSlots.findIndex((p) => p && p.id === part.id);
            if (existingIndex !== -1 && existingIndex !== slotIndex) {
              newSlots[existingIndex] = oldPart;
            }
          }

          newSlots[slotIndex] = part;
          return { resonanceSlots: newSlots };
        }),

      clearResonanceSlots: () =>
        set({ resonanceSlots: [...EMPTY_RESONANCE_SLOTS] }),

      checkResonanceCondition: (parts, combo) =>
        checkResonanceConditionImpl(parts, combo),

      attemptResonance: () => {
        const state = get();
        const placedParts = state.resonanceSlots.filter(
          (p): p is Part => p !== null
        );

        if (placedParts.length < 2) {
          const record: ResonanceRecord = {
            id: generateId(),
            comboId: null,
            comboName: null,
            success: false,
            partIds: placedParts.map((p) => p.id),
            partNames: placedParts.map((p) => p.name),
            message: '至少需要放入2件零件才能尝试共鸣',
            attemptedAt: Date.now(),
          };
          set((s) => ({ resonanceRecords: [record, ...s.resonanceRecords] }));
          return {
            success: false,
            comboId: null,
            comboName: null,
            isNew: false,
            message: '至少需要放入2件零件才能尝试共鸣',
          };
        }

        let matchedCombo: ResonanceCombo | null = null;
        for (const combo of RESONANCE_COMBOS) {
          if (checkResonanceConditionImpl(placedParts, combo)) {
            matchedCombo = combo;
            break;
          }
        }

        if (matchedCombo) {
          const isNew = !state.unlockedResonances.includes(matchedCombo.id);

          const record: ResonanceRecord = {
            id: generateId(),
            comboId: matchedCombo.id,
            comboName: matchedCombo.name,
            success: true,
            partIds: placedParts.map((p) => p.id),
            partNames: placedParts.map((p) => p.name),
            message: isNew
              ? `恭喜！发现全新共鸣词条：${matchedCombo.name}！`
              : `共鸣成功！再次激活了：${matchedCombo.name}`,
            attemptedAt: Date.now(),
          };

          set((s) => ({
            resonanceRecords: [record, ...s.resonanceRecords],
            unlockedResonances: isNew
              ? [...s.unlockedResonances, matchedCombo!.id]
              : s.unlockedResonances,
            activeResonances: s.activeResonances.some(
              (r) => r.comboId === matchedCombo!.id
            )
              ? s.activeResonances
              : [
                  ...s.activeResonances,
                  { comboId: matchedCombo!.id, activatedAt: Date.now() },
                ],
          }));

          return {
            success: true,
            comboId: matchedCombo.id,
            comboName: matchedCombo.name,
            isNew,
            message: isNew
              ? `恭喜！发现全新共鸣词条：${matchedCombo.name}！`
              : `共鸣成功！再次激活了：${matchedCombo.name}`,
          };
        }

        const record: ResonanceRecord = {
          id: generateId(),
          comboId: null,
          comboName: null,
          success: false,
          partIds: placedParts.map((p) => p.id),
          partNames: placedParts.map((p) => p.name),
          message: '这些零件之间没有产生共鸣，换个组合试试？',
          attemptedAt: Date.now(),
        };
        set((s) => ({ resonanceRecords: [record, ...s.resonanceRecords] }));

        return {
          success: false,
          comboId: null,
          comboName: null,
          isNew: false,
          message: '这些零件之间没有产生共鸣，换个组合试试？',
        };
      },

      toggleActiveResonance: (comboId) =>
        set((state) => {
          const exists = state.activeResonances.some((r) => r.comboId === comboId);
          if (exists) {
            return {
              activeResonances: state.activeResonances.filter(
                (r) => r.comboId !== comboId
              ),
            };
          }
          return {
            activeResonances: [
              ...state.activeResonances,
              { comboId, activatedAt: Date.now() },
            ],
          };
        }),

      getActiveResonanceBonuses: () => {
        const state = get();
        const result: ResonanceBonus = {
          weightBonus: 0,
          energyBonus: 0,
          skillBonus: 0,
          durabilityBonus: 0,
          missionBonus: {},
          repairSuccessBonus: 0,
          recycleBonus: 0,
          blindBoxLuck: 0,
        };

        for (const active of state.activeResonances) {
          const combo = RESONANCE_COMBOS.find((c) => c.id === active.comboId);
          if (!combo) continue;

          if (combo.bonus.weightBonus) {
            result.weightBonus = (result.weightBonus || 0) + combo.bonus.weightBonus;
          }
          if (combo.bonus.energyBonus) {
            result.energyBonus = (result.energyBonus || 0) + combo.bonus.energyBonus;
          }
          if (combo.bonus.skillBonus) {
            result.skillBonus = (result.skillBonus || 0) + combo.bonus.skillBonus;
          }
          if (combo.bonus.durabilityBonus) {
            result.durabilityBonus =
              (result.durabilityBonus || 0) + combo.bonus.durabilityBonus;
          }
          if (combo.bonus.repairSuccessBonus) {
            result.repairSuccessBonus =
              (result.repairSuccessBonus || 0) + combo.bonus.repairSuccessBonus;
          }
          if (combo.bonus.recycleBonus) {
            result.recycleBonus = (result.recycleBonus || 0) + combo.bonus.recycleBonus;
          }
          if (combo.bonus.blindBoxLuck) {
            result.blindBoxLuck =
              (result.blindBoxLuck || 0) + combo.bonus.blindBoxLuck;
          }
          if (combo.bonus.missionBonus) {
            for (const [missionType, bonus] of Object.entries(
              combo.bonus.missionBonus
            )) {
              if (!result.missionBonus) result.missionBonus = {};
              result.missionBonus[missionType as keyof typeof result.missionBonus] =
                (result.missionBonus[missionType as keyof typeof result.missionBonus] ||
                  0) + (bonus || 0);
            }
          }
        }

        return result;
      },

      loadFromStorage: () => {},

      resetGame: () =>
        set({
          parts: [],
          robots: [],
          credits: INITIAL_CREDITS,
          materials: INITIAL_MATERIALS,
          missionRecords: [],
          repairRecords: [],
          assemblyPlans: [],
          selectedParts: { ...EMPTY_SELECTED_PARTS },
          resonanceSlots: [...EMPTY_RESONANCE_SLOTS],
          unlockedResonances: [],
          activeResonances: [],
          resonanceRecords: [],
        }),
    }),
    {
      name: 'robot-workshop-storage',
      partialize: (state) => ({
        parts: state.parts,
        robots: state.robots,
        credits: state.credits,
        materials: state.materials,
        missionRecords: state.missionRecords,
        repairRecords: state.repairRecords,
        assemblyPlans: state.assemblyPlans,
        config: state.config,
        unlockedResonances: state.unlockedResonances,
        activeResonances: state.activeResonances,
        resonanceRecords: state.resonanceRecords,
      }),
    }
  )
);
