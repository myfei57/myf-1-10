import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Lightbulb,
  History,
  Sparkles,
  Plus,
  X,
  Search,
  Star,
  Zap,
  Scale,
  Gauge,
  Layers,
  Heart,
  Shield,
  Wrench,
  Swords,
  Truck,
  Users,
  Droplets,
  Crown,
  Bot,
  Eye,
  Gem,
  Factory,
  Flame,
  Activity,
  Rocket,
  FlameKindling,
  Package,
  Trash2,
  Check,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { PageContainer } from '../components/PageContainer';
import { PartCard } from '../components/PartCard';
import { Modal } from '../components/Modal';
import { useGameStore } from '../store/useGameStore';
import { RESONANCE_COMBOS, PART_TYPE_NAMES } from '../data/defaultConfig';
import type { Part, PartType, Rarity, ResonanceCategory } from '../types';
import { getRarityColorClass, formatDate } from '../utils/helpers';

const ICON_MAP: Record<string, typeof Sparkles> = {
  Sparkles,
  ShieldAlert: Shield,
  Heart,
  Eye,
  Factory,
  Swords,
  Crown,
  Gem,
  Zap,
  Bot,
  Wrench,
  Flame,
  Activity,
  Rocket,
  FlameKindling,
};

const CATEGORY_COLORS: Record<ResonanceCategory, string> = {
  流派: '#3B82F6',
  工具链: '#10B981',
  元素: '#8B5CF6',
  稀有度: '#F59E0B',
  部位: '#EC4899',
};

type TabKey = 'altar' | 'discovered' | 'clues' | 'history' | 'bonuses';

export function ResonancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('altar');
  const [showPartPicker, setShowPartPicker] = useState<number | null>(null);
  const [pickerFilter, setPickerFilter] = useState('');
  const [pickerRarity, setPickerRarity] = useState<Rarity | 'all'>('all');
  const [pickerType, setPickerType] = useState<PartType | 'all'>('all');
  const [resultToast, setResultToast] = useState<{
    success: boolean;
    message: string;
    isNew?: boolean;
  } | null>(null);
  const [selectedComboDetail, setSelectedComboDetail] = useState<string | null>(null);

  const parts = useGameStore((s) => s.parts);
  const config = useGameStore((s) => s.config);
  const resonanceSlots = useGameStore((s) => s.resonanceSlots);
  const unlockedResonances = useGameStore((s) => s.unlockedResonances);
  const activeResonances = useGameStore((s) => s.activeResonances);
  const resonanceRecords = useGameStore((s) => s.resonanceRecords);
  const placeResonancePart = useGameStore((s) => s.placeResonancePart);
  const clearResonanceSlots = useGameStore((s) => s.clearResonanceSlots);
  const attemptResonance = useGameStore((s) => s.attemptResonance);
  const toggleActiveResonance = useGameStore((s) => s.toggleActiveResonance);
  const getActiveResonanceBonuses = useGameStore((s) => s.getActiveResonanceBonuses);

  const bonuses = getActiveResonanceBonuses();

  const placedPartsCount = resonanceSlots.filter((p) => p !== null).length;
  const placedStats = useMemo(() => {
    const valid = resonanceSlots.filter((p): p is Part => p !== null);
    return {
      totalWeight: valid.reduce((s, p) => s + p.weight, 0),
      totalEnergy: valid.reduce((s, p) => s + p.energy, 0),
      totalSkill: valid.reduce((s, p) => s + p.skillSlots, 0),
      avgDurability:
        valid.length > 0
          ? Math.round(valid.reduce((s, p) => s + p.maxDurability, 0) / valid.length)
          : 0,
    };
  }, [resonanceSlots]);

  const handleAttemptResonance = () => {
    const result = attemptResonance();
    setResultToast(result);
    setTimeout(() => setResultToast(null), 3500);
  };

  const filteredPickerParts = useMemo(() => {
    const placedIds = new Set(resonanceSlots.filter(Boolean).map((p) => p!.id));
    let result = parts.filter((p) => !placedIds.has(p.id));
    if (pickerFilter) {
      const term = pickerFilter.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)
      );
    }
    if (pickerRarity !== 'all') {
      result = result.filter((p) => p.rarity === pickerRarity);
    }
    if (pickerType !== 'all') {
      result = result.filter((p) => p.type === pickerType);
    }
    return result;
  }, [parts, resonanceSlots, pickerFilter, pickerRarity, pickerType]);

  const discoveredCombos = useMemo(
    () => RESONANCE_COMBOS.filter((c) => unlockedResonances.includes(c.id)),
    [unlockedResonances]
  );
  const undiscoveredCombos = useMemo(
    () => RESONANCE_COMBOS.filter((c) => !unlockedResonances.includes(c.id)),
    [unlockedResonances]
  );

  const selectedCombo = useMemo(
    () => RESONANCE_COMBOS.find((c) => c.id === selectedComboDetail),
    [selectedComboDetail]
  );

  const getIcon = (iconName: string) => ICON_MAP[iconName] || Sparkles;

  const renderDifficultyStars = (difficulty: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < difficulty ? 'text-neon-orange fill-neon-orange' : 'text-white/20'
          }`}
        />
      ))}
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: typeof Sparkles; badge?: number }[] = [
    { key: 'altar', label: '共鸣台', icon: Zap },
    { key: 'discovered', label: '已发现词条', icon: BookOpen, badge: discoveredCombos.length },
    { key: 'clues', label: '未解锁线索', icon: Lightbulb, badge: undiscoveredCombos.length },
    { key: 'history', label: '组合历史', icon: History, badge: resonanceRecords.length },
    { key: 'bonuses', label: '共鸣加成', icon: Shield, badge: activeResonances.length },
  ];

  return (
    <PageContainer
      title="共鸣词典"
      subtitle={`发现 ${discoveredCombos.length}/${RESONANCE_COMBOS.length} 个共鸣词条 | 激活中: ${activeResonances.length}`}
    >
      {resultToast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl border-2 shadow-2xl backdrop-blur-lg max-w-md ${
            resultToast.success
              ? resultToast.isNew
                ? 'bg-gradient-to-r from-neon-purple/30 to-neon-blue/30 border-neon-purple shadow-neon-purple'
                : 'bg-gradient-to-r from-neon-green/30 to-neon-blue/30 border-neon-green shadow-neon-green'
              : 'bg-gradient-to-r from-red-500/30 to-orange-500/30 border-red-400/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {resultToast.success ? (
              resultToast.isNew ? (
                <div className="p-2 rounded-lg bg-neon-purple/30">
                  <Crown className="w-6 h-6 text-neon-purple" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-neon-green/30">
                  <Check className="w-6 h-6 text-neon-green" />
                </div>
              )
            ) : (
              <div className="p-2 rounded-lg bg-red-500/30">
                <X className="w-6 h-6 text-red-400" />
              </div>
            )}
            <div>
              <p
                className={`font-display font-bold ${
                  resultToast.success
                    ? resultToast.isNew
                      ? 'text-neon-purple'
                      : 'text-neon-green'
                    : 'text-red-400'
                }`}
              >
                {resultToast.isNew ? '全新发现！' : resultToast.success ? '共鸣成功' : '共鸣失败'}
              </p>
              <p className="text-sm text-white/80">{resultToast.message}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="card p-2 mb-6">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-neon-blue/20 text-neon-blue shadow-inner'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-display">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === tab.key
                      ? 'bg-neon-blue/30 text-neon-blue'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="resonanceTabIndicator"
                  className="absolute bottom-0 left-4 right-4 h-0.5 bg-neon-blue rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'altar' && (
          <motion.div
            key="altar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-neon-purple" />
                    共鸣台
                  </h2>
                  <p className="text-sm text-white/50">
                    将疑似有关联的零件放入槽位，触发共鸣实验，解锁隐藏的组合词条
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearResonanceSlots}
                    disabled={placedPartsCount === 0}
                    className="btn btn-ghost text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空
                  </button>
                  <button
                    onClick={handleAttemptResonance}
                    disabled={placedPartsCount < 2}
                    className="btn btn-primary text-sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    尝试共鸣
                  </button>
                </div>
              </div>

              <div className="relative bg-background-tertiary/50 rounded-2xl p-6 border border-border-subtle">
                <div className="absolute inset-0 bg-gradient-radial from-neon-purple/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
                <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {resonanceSlots.map((part, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowPartPicker(index)}
                      className="relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden"
                      style={{
                        borderColor: part ? config.rarities[part.rarity].color : 'rgba(255,255,255,0.15)',
                        background: part
                          ? `linear-gradient(135deg, ${config.rarities[part.rarity].bgColor}, rgba(30, 41, 59, 0.9))`
                          : 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      {part ? (
                        <div className="w-full h-full p-3 flex flex-col items-center justify-center text-center">
                          <div
                            className="p-2 rounded-lg mb-2"
                            style={{ backgroundColor: config.rarities[part.rarity].bgColor }}
                          >
                            {(() => {
                              const PI: Record<PartType, typeof Zap> = {
                                head: Bot,
                                body: Shield,
                                arm: Wrench,
                                leg: Truck,
                                core: Zap,
                                tool: Sparkles,
                              };
                              const Ico = PI[part.type];
                              return (
                                <Ico
                                  className="w-6 h-6"
                                  style={{ color: config.rarities[part.rarity].color }}
                                />
                              );
                            })()}
                          </div>
                          <p
                            className={`text-xs font-bold truncate w-full ${getRarityColorClass(part.rarity)}`}
                          >
                            {part.name}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {PART_TYPE_NAMES[part.type]}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              placeResonancePart(index, null);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                          <Plus className="w-8 h-8 mb-1" />
                          <p className="text-xs">槽位 {index + 1}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {placedPartsCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative mt-6 pt-6 border-t border-border-subtle"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                        <Scale className="w-5 h-5 text-neon-blue" />
                        <div>
                          <p className="text-xs text-white/50">总重量</p>
                          <p className="font-mono font-bold text-white">{placedStats.totalWeight}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                        <Gauge className="w-5 h-5 text-neon-orange" />
                        <div>
                          <p className="text-xs text-white/50">总能耗</p>
                          <p className="font-mono font-bold text-white">{placedStats.totalEnergy}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                        <Layers className="w-5 h-5 text-neon-purple" />
                        <div>
                          <p className="text-xs text-white/50">总技能</p>
                          <p className="font-mono font-bold text-white">{placedStats.totalSkill}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-background-tertiary rounded-lg">
                        <Heart className="w-5 h-5 text-neon-green" />
                        <div>
                          <p className="text-xs text-white/50">平均耐久</p>
                          <p className="font-mono font-bold text-white">{placedStats.avgDurability}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {activeResonances.length > 0 && (
              <div className="card p-6">
                <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-neon-green" />
                  当前激活的共鸣
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeResonances.map((active) => {
                    const combo = RESONANCE_COMBOS.find((c) => c.id === active.comboId);
                    if (!combo) return null;
                    const Icon = getIcon(combo.icon);
                    return (
                      <div
                        key={active.comboId}
                        className="p-4 rounded-xl border border-neon-green/30 bg-neon-green/5"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[combo.category] + '30' }}
                          >
                            <Icon
                              className="w-5 h-5"
                              style={{ color: CATEGORY_COLORS[combo.category] }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-white text-sm">
                              {combo.name}
                            </p>
                            <p
                              className="text-xs mt-0.5"
                              style={{ color: CATEGORY_COLORS[combo.category] }}
                            >
                              {combo.category}
                            </p>
                            <p className="text-xs text-white/50 mt-2 line-clamp-2">
                              {combo.description}
                            </p>
                            <button
                              onClick={() => toggleActiveResonance(combo.id)}
                              className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              停用此共鸣
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'discovered' && (
          <motion.div
            key="discovered"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {discoveredCombos.length === 0 ? (
              <div className="card p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="font-display text-xl text-white/50 mb-2">还没有发现任何词条</h3>
                <p className="text-white/30">前往共鸣台尝试零件组合，解锁隐藏的共鸣词条！</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {discoveredCombos.map((combo, index) => {
                  const Icon = getIcon(combo.icon);
                  const isActive = activeResonances.some((r) => r.comboId === combo.id);
                  return (
                    <motion.div
                      key={combo.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      onClick={() => setSelectedComboDetail(combo.id)}
                      className={`card p-5 cursor-pointer relative overflow-hidden ${
                        isActive ? 'ring-2 ring-neon-green' : ''
                      }`}
                      style={{
                        borderColor: isActive ? undefined : CATEGORY_COLORS[combo.category] + '40',
                      }}
                    >
                      <div
                        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20"
                        style={{ backgroundColor: CATEGORY_COLORS[combo.category] }}
                      />
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="p-2.5 rounded-xl"
                            style={{ backgroundColor: CATEGORY_COLORS[combo.category] + '25' }}
                          >
                            <Icon
                              className="w-6 h-6"
                              style={{ color: CATEGORY_COLORS[combo.category] }}
                            />
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-display"
                              style={{
                                backgroundColor: CATEGORY_COLORS[combo.category] + '20',
                                color: CATEGORY_COLORS[combo.category],
                              }}
                            >
                              {combo.category}
                            </span>
                            {renderDifficultyStars(combo.difficulty)}
                          </div>
                        </div>
                        <h3 className="font-display font-bold text-white text-lg mb-1">
                          {combo.name}
                        </h3>
                        {combo.style && (
                          <p className="text-xs text-neon-blue mb-2">【{combo.style}】</p>
                        )}
                        <p className="text-sm text-white/60 mb-3 line-clamp-2">
                          {combo.description}
                        </p>
                        <div className="pt-3 border-t border-border-subtle">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/40">共鸣加成效果</span>
                            {isActive ? (
                              <span className="text-xs text-neon-green flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                激活中
                              </span>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-white/40" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'clues' && (
          <motion.div
            key="clues"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {undiscoveredCombos.length === 0 ? (
              <div className="card p-12 text-center">
                <Crown className="w-16 h-16 mx-auto mb-4 text-neon-orange" />
                <h3 className="font-display text-xl text-neon-orange mb-2">全部共鸣已解锁！</h3>
                <p className="text-white/50">恭喜！你发现了所有隐藏的共鸣词条。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {undiscoveredCombos.map((combo, index) => (
                  <motion.div
                    key={combo.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="card p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-white/5 flex-shrink-0 self-center">
                        <span className="text-2xl font-display font-bold text-white/20">
                          ?
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: CATEGORY_COLORS[combo.category] + '20',
                              color: CATEGORY_COLORS[combo.category],
                            }}
                          >
                            {combo.category}
                          </span>
                          {renderDifficultyStars(combo.difficulty)}
                        </div>
                        <p className="text-white/40 text-sm mb-3">
                          <span className="font-display text-white/60 mr-2">未解锁词条</span>
                          {combo.style && `【${combo.style}】`}
                        </p>
                        <div className="p-3 rounded-lg bg-background-tertiary/70 border-l-4"
                          style={{ borderColor: CATEGORY_COLORS[combo.category] }}
                        >
                          <div className="flex items-start gap-2">
                            <Lightbulb
                              className="w-4 h-4 mt-0.5 flex-shrink-0"
                              style={{ color: CATEGORY_COLORS[combo.category] }}
                            />
                            <p className="text-sm text-white/75 italic">{combo.clue}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {resonanceRecords.length === 0 ? (
              <div className="card p-12 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="font-display text-xl text-white/50 mb-2">暂无共鸣记录</h3>
                <p className="text-white/30">开始尝试共鸣组合，所有尝试都会记录在这里。</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="divide-y divide-border-subtle max-h-[600px] overflow-y-auto">
                  {resonanceRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.4) }}
                      className={`p-4 hover:bg-white/5 transition-colors ${
                        record.success ? 'bg-neon-green/[0.02]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            record.success
                              ? 'bg-neon-green/20 text-neon-green'
                              : 'bg-red-500/10 text-red-400/60'
                          }`}
                        >
                          {record.success ? (
                            <Sparkles className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <p
                              className={`font-display font-bold ${
                                record.success ? 'text-neon-green' : 'text-white/80'
                              }`}
                            >
                              {record.success
                                ? record.comboName || '共鸣成功'
                                : '共鸣失败'}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-white/40">
                              <Clock className="w-3 h-3" />
                              {formatDate(record.attemptedAt)}
                            </div>
                          </div>
                          <p className="text-sm text-white/60 mb-2">{record.message}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {record.partNames.map((name, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded bg-background-tertiary text-white/70"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'bonuses' && (
          <motion.div
            key="bonuses"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="card p-6">
              <h3 className="font-display text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-purple" />
                总加成汇总
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-gradient-to-br from-neon-blue/10 to-transparent border border-neon-blue/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-neon-blue" />
                    <span className="text-xs text-white/50">重量加成</span>
                  </div>
                  <p
                    className={`text-2xl font-display font-bold ${
                      (bonuses.weightBonus || 0) > 0
                        ? 'text-neon-green'
                        : (bonuses.weightBonus || 0) < 0
                        ? 'text-red-400'
                        : 'text-white/30'
                    }`}
                  >
                    {bonuses.weightBonus ? (
                      <>
                        {bonuses.weightBonus > 0 ? '+' : ''}
                        {bonuses.weightBonus}%
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-neon-orange/10 to-transparent border border-neon-orange/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-neon-orange" />
                    <span className="text-xs text-white/50">能耗加成</span>
                  </div>
                  <p
                    className={`text-2xl font-display font-bold ${
                      (bonuses.energyBonus || 0) < 0
                        ? 'text-neon-green'
                        : (bonuses.energyBonus || 0) > 0
                        ? 'text-red-400'
                        : 'text-white/30'
                    }`}
                  >
                    {bonuses.energyBonus ? (
                      <>
                        {bonuses.energyBonus > 0 ? '+' : ''}
                        {bonuses.energyBonus}%
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-neon-purple/10 to-transparent border border-neon-purple/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-neon-purple" />
                    <span className="text-xs text-white/50">技能加成</span>
                  </div>
                  <p
                    className={`text-2xl font-display font-bold ${
                      (bonuses.skillBonus || 0) > 0 ? 'text-neon-green' : 'text-white/30'
                    }`}
                  >
                    {bonuses.skillBonus ? `+${bonuses.skillBonus}` : '—'}
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-neon-green/10 to-transparent border border-neon-green/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-neon-green" />
                    <span className="text-xs text-white/50">耐久加成</span>
                  </div>
                  <p
                    className={`text-2xl font-display font-bold ${
                      (bonuses.durabilityBonus || 0) > 0 ? 'text-neon-green' : 'text-white/30'
                    }`}
                  >
                    {bonuses.durabilityBonus ? `+${bonuses.durabilityBonus}%` : '—'}
                  </p>
                </div>
              </div>

              {(bonuses.missionBonus && Object.keys(bonuses.missionBonus).length > 0) ||
              (bonuses.repairSuccessBonus || 0) > 0 ||
              (bonuses.recycleBonus || 0) > 0 ||
              (bonuses.blindBoxLuck || 0) > 0 ? (
                <div className="space-y-4">
                  {bonuses.missionBonus && Object.keys(bonuses.missionBonus).length > 0 && (
                    <div>
                      <h4 className="text-sm font-display text-white/70 mb-3">任务加成</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(bonuses.missionBonus).map(([type, value]) => {
                          if (!value) return null;
                          const missionInfo: Record<
                            string,
                            { name: string; icon: typeof Truck; color: string }
                          > = {
                            transport: { name: '运输任务', icon: Truck, color: '#3B82F6' },
                            cleaning: { name: '清洁任务', icon: Droplets, color: '#06B6D4' },
                            rescue: { name: '救援任务', icon: Users, color: '#10B981' },
                            combat: { name: '战斗任务', icon: Swords, color: '#EF4444' },
                          };
                          const info = missionInfo[type] || {
                            name: type,
                            icon: Package,
                            color: '#888',
                          };
                          const MIcon = info.icon;
                          return (
                            <div
                              key={type}
                              className="p-3 rounded-lg bg-background-tertiary border"
                              style={{ borderColor: info.color + '30' }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <MIcon
                                  className="w-4 h-4"
                                  style={{ color: info.color }}
                                />
                                <span className="text-xs text-white/60">{info.name}</span>
                              </div>
                              <p className="font-mono font-bold text-neon-green">
                                +{value}%
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(bonuses.repairSuccessBonus || 0) > 0 && (
                      <div className="p-4 rounded-lg bg-background-tertiary border border-neon-green/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="w-4 h-4 text-neon-green" />
                          <span className="text-xs text-white/60">维修成功率</span>
                        </div>
                        <p className="font-mono font-bold text-neon-green text-lg">
                          +{bonuses.repairSuccessBonus}%
                        </p>
                      </div>
                    )}
                    {(bonuses.recycleBonus || 0) > 0 && (
                      <div className="p-4 rounded-lg bg-background-tertiary border border-neon-blue/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Trash2 className="w-4 h-4 text-neon-blue" />
                          <span className="text-xs text-white/60">拆解回收率</span>
                        </div>
                        <p className="font-mono font-bold text-neon-blue text-lg">
                          +{bonuses.recycleBonus}%
                        </p>
                      </div>
                    )}
                    {(bonuses.blindBoxLuck || 0) > 0 && (
                      <div className="p-4 rounded-lg bg-background-tertiary border border-neon-orange/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="w-4 h-4 text-neon-orange" />
                          <span className="text-xs text-white/60">盲盒幸运</span>
                        </div>
                        <p className="font-mono font-bold text-neon-orange text-lg">
                          +{bonuses.blindBoxLuck}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-white/30">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">激活共鸣词条以获得加成效果</p>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-neon-purple" />
                  共鸣管理
                </span>
                <span className="text-sm font-normal text-white/50">
                  已解锁 {discoveredCombos.length} 个共鸣
                </span>
              </h3>

              {discoveredCombos.length === 0 ? (
                <div className="text-center py-8 text-white/30">
                  <p className="text-sm">去共鸣台解锁一些共鸣词条吧</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveredCombos.map((combo) => {
                    const isActive = activeResonances.some((r) => r.comboId === combo.id);
                    const Icon = getIcon(combo.icon);
                    return (
                      <div
                        key={combo.id}
                        className={`p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                          isActive
                            ? 'bg-neon-green/10 border border-neon-green/40'
                            : 'bg-background-tertiary/50 border border-transparent hover:border-white/10'
                        }`}
                        onClick={() => toggleActiveResonance(combo.id)}
                      >
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            isActive ? 'bg-neon-green/20' : 'bg-white/5'
                          }`}
                          style={{
                            color: isActive ? '#10B981' : CATEGORY_COLORS[combo.category],
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-display font-bold text-white text-sm truncate">
                              {combo.name}
                            </p>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[combo.category] + '20',
                                color: CATEGORY_COLORS[combo.category],
                              }}
                            >
                              {combo.category}
                            </span>
                          </div>
                          <p className="text-xs text-white/50 truncate">
                            {combo.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div
                            className={`w-10 h-6 rounded-full transition-all relative ${
                              isActive ? 'bg-neon-green/50' : 'bg-white/10'
                            }`}
                          >
                            <motion.div
                              animate={{ x: isActive ? 18 : 2 }}
                              className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showPartPicker !== null}
        onClose={() => setShowPartPicker(null)}
        title={`选择零件放入槽位 ${(showPartPicker ?? 0) + 1}`}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索零件..."
                value={pickerFilter}
                onChange={(e) => setPickerFilter(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={pickerType}
              onChange={(e) => setPickerType(e.target.value as PartType | 'all')}
              className="input max-w-[140px]"
            >
              <option value="all">全部部位</option>
              {Object.entries(PART_TYPE_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={pickerRarity}
              onChange={(e) => setPickerRarity(e.target.value as Rarity | 'all')}
              className="input max-w-[140px]"
            >
              <option value="all">全部稀有度</option>
              {Object.entries(config.rarities).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[450px] overflow-y-auto pr-2 -mr-2">
            {filteredPickerParts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40">没有可用的零件</p>
                <p className="text-xs text-white/25 mt-1">
                  去盲盒开盒获取更多零件吧！
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPickerParts.map((part) => (
                  <motion.div
                    key={part.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      if (showPartPicker !== null) {
                        placeResonancePart(showPartPicker, part);
                        setShowPartPicker(null);
                        setPickerFilter('');
                        setPickerRarity('all');
                        setPickerType('all');
                      }
                    }}
                  >
                    <PartCard part={part} size="sm" selectable />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={selectedComboDetail !== null}
        onClose={() => setSelectedComboDetail(null)}
        title="共鸣词条详情"
        size="lg"
      >
        {selectedCombo && (
          <div className="space-y-5">
            <div
              className="p-6 rounded-xl relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${
                  CATEGORY_COLORS[selectedCombo.category]
                }20, transparent)`,
                borderColor: CATEGORY_COLORS[selectedCombo.category] + '40',
                borderWidth: 1,
              }}
            >
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: CATEGORY_COLORS[selectedCombo.category] }}
              />
              <div className="relative flex items-start gap-4">
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: CATEGORY_COLORS[selectedCombo.category] + '30',
                  }}
                >
                  {(() => {
                    const I = getIcon(selectedCombo.icon);
                    return (
                      <I
                        className="w-10 h-10"
                        style={{ color: CATEGORY_COLORS[selectedCombo.category] }}
                      />
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-display"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[selectedCombo.category] + '20',
                        color: CATEGORY_COLORS[selectedCombo.category],
                      }}
                    >
                      {selectedCombo.category}
                    </span>
                    {selectedCombo.style && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-neon-blue/20 text-neon-blue">
                        {selectedCombo.style}风格
                      </span>
                    )}
                    <div className="ml-auto">
                      {renderDifficultyStars(selectedCombo.difficulty)}
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-2xl text-white mb-2">
                    {selectedCombo.name}
                  </h3>
                  <p className="text-white/70">{selectedCombo.description}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5">
                <h4 className="font-display text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neon-purple" />
                  背景传说
                </h4>
                <p className="text-sm text-white/65 leading-relaxed italic">
                  "{selectedCombo.lore}"
                </p>
              </div>
              <div className="card p-5">
                <h4 className="font-display text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-neon-orange" />
                  解锁线索
                </h4>
                <p className="text-sm text-white/65 leading-relaxed">
                  {selectedCombo.clue}
                </p>
              </div>
            </div>

            <div className="card p-5">
              <h4 className="font-display text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-green" />
                共鸣加成效果
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedCombo.bonus.weightBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Scale className="w-5 h-5 text-neon-blue mx-auto mb-1" />
                    <p className="text-xs text-white/50">重量</p>
                    <p
                      className={`font-mono font-bold ${
                        selectedCombo.bonus.weightBonus! > 0
                          ? 'text-neon-green'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedCombo.bonus.weightBonus > 0 ? '+' : ''}
                      {selectedCombo.bonus.weightBonus}%
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.energyBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Gauge className="w-5 h-5 text-neon-orange mx-auto mb-1" />
                    <p className="text-xs text-white/50">能耗</p>
                    <p
                      className={`font-mono font-bold ${
                        selectedCombo.bonus.energyBonus! < 0
                          ? 'text-neon-green'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedCombo.bonus.energyBonus > 0 ? '+' : ''}
                      {selectedCombo.bonus.energyBonus}%
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.skillBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Layers className="w-5 h-5 text-neon-purple mx-auto mb-1" />
                    <p className="text-xs text-white/50">技能槽</p>
                    <p className="font-mono font-bold text-neon-green">
                      +{selectedCombo.bonus.skillBonus}
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.durabilityBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Heart className="w-5 h-5 text-neon-green mx-auto mb-1" />
                    <p className="text-xs text-white/50">耐久</p>
                    <p className="font-mono font-bold text-neon-green">
                      +{selectedCombo.bonus.durabilityBonus}%
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.repairSuccessBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Wrench className="w-5 h-5 text-neon-green mx-auto mb-1" />
                    <p className="text-xs text-white/50">维修成功率</p>
                    <p className="font-mono font-bold text-neon-green">
                      +{selectedCombo.bonus.repairSuccessBonus}%
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.recycleBonus !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Trash2 className="w-5 h-5 text-neon-blue mx-auto mb-1" />
                    <p className="text-xs text-white/50">回收率</p>
                    <p className="font-mono font-bold text-neon-blue">
                      +{selectedCombo.bonus.recycleBonus}%
                    </p>
                  </div>
                )}
                {selectedCombo.bonus.blindBoxLuck !== undefined && (
                  <div className="p-3 rounded-lg bg-background-tertiary text-center">
                    <Crown className="w-5 h-5 text-neon-orange mx-auto mb-1" />
                    <p className="text-xs text-white/50">盲盒幸运</p>
                    <p className="font-mono font-bold text-neon-orange">
                      +{selectedCombo.bonus.blindBoxLuck}%
                    </p>
                  </div>
                )}
              </div>
              {selectedCombo.bonus.missionBonus &&
                Object.keys(selectedCombo.bonus.missionBonus).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    <p className="text-xs text-white/50 mb-2">任务额外加成</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedCombo.bonus.missionBonus).map(
                        ([type, value]) => {
                          if (!value) return null;
                          const missionNames: Record<string, string> = {
                            transport: '运输',
                            cleaning: '清洁',
                            rescue: '救援',
                            combat: '战斗',
                          };
                          return (
                            <span
                              key={type}
                              className="px-3 py-1 rounded-full text-sm bg-neon-green/15 text-neon-green font-mono"
                            >
                              {missionNames[type] || type} +{value}%
                            </span>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedComboDetail(null)}
                className="btn btn-ghost"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  toggleActiveResonance(selectedCombo.id);
                }}
                className={
                  activeResonances.some(
                    (r) => r.comboId === selectedCombo.id
                  )
                    ? 'btn btn-ghost text-red-400'
                    : 'btn btn-primary'
                }
              >
                {activeResonances.some((r) => r.comboId === selectedCombo.id)
                  ? '停用此共鸣'
                  : '激活此共鸣'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
