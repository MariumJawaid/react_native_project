import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ─── Static recommendation data (medically accurate for Alzheimer's patients) ───
const RECOMMENDATIONS = [
  {
    id: '1',
    title: 'Daily Memory Exercises',
    category: 'Mental Health',
    categoryColor: '#7c3aed',
    categoryBg: '#ede9fe',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
    shortDescription:
      'Simple cognitive activities can help slow memory decline and keep the mind engaged.',
    fullContent: `Regular mental stimulation is among the most effective non-pharmacological approaches for Alzheimer's patients. Here are evidence-based exercises:\n\n• **Word Association Games** – Ask the patient to name objects in a specific category (e.g., fruits, animals). Start easy and increase complexity gradually.\n\n• **Photo Reminiscence** – Show familiar family photographs and encourage storytelling about the people and events depicted. This activates long-term memory.\n\n• **Jigsaw Puzzles** – Start with large-piece, low-count puzzles (4–12 pieces) and increase complexity based on ability. Puzzles engage spatial reasoning and patience.\n\n• **Reading Aloud** – Short poems, verses, or headlines can stimulate language centers. Pair with discussion about the content.\n\n• **Music Therapy** – Play songs from the patient's youth. Music memory is often preserved longer than other memory types.\n\n🕐 Recommended: 15–20 minute sessions, 2–3 times per day. Always stop if the patient shows frustration — forced exercises can be counterproductive.`,
  },
  {
    id: '2',
    title: 'Sleep Improvement Routines',
    category: 'Sleep',
    categoryColor: '#0284c7',
    categoryBg: '#e0f2fe',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80',
    shortDescription:
      'Consistent sleep schedules significantly reduce sundowning and agitation in Alzheimer\'s patients.',
    fullContent: `Sleep disturbances affect up to 45% of people with Alzheimer's. Disrupted sleep worsens cognitive symptoms and caregiver burnout.\n\n**Establishing a Routine:**\n• Set fixed wake-up and bedtime — even on weekends\n• Limit daytime naps to 30 minutes maximum before 2 PM\n• Use bright light therapy in the morning (simulate sunrise with a light box)\n\n**Evening Wind-Down Protocol:**\n• Dim all lights 2 hours before bed\n• Reduce TV/screen time — blue light suppresses melatonin\n• Offer a warm (not hot) bath or foot soak\n• Play soft, familiar music or nature sounds\n• Ensure the room temperature is between 60–67°F (15–19°C)\n\n**Addressing Sundowning (late-day confusion):**\n• Increase daytime physical activity\n• Maintain a predictable daily schedule to reduce anxiety\n• Avoid large meals or caffeine after 2 PM\n\n⚠️ Consult a neurologist before using any sleep medications in Alzheimer's patients — many common sleep aids worsen cognitive symptoms.`,
  },
  {
    id: '3',
    title: 'Fall Prevention at Home',
    category: 'Safety',
    categoryColor: '#b45309',
    categoryBg: '#fef3c7',
    image: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=800&q=80',
    shortDescription:
      'Falls are the leading cause of injury in Alzheimer\'s patients. Simple home modifications can prevent 70% of falls.',
    fullContent: `Alzheimer's impairs depth perception, balance, and reaction time — significantly increasing fall risk. Most falls occur in the bathroom, bedroom, and on stairs.\n\n**Home Modifications:**\n• Install grab bars in bathroom (next to toilet and in shower)\n• Use non-slip mats in bathroom, kitchen, and entryway\n• Ensure all areas have adequate lighting — especially at night (use nightlights)\n• Remove loose rugs, electrical cords, and clutter from walkways\n• Secure or remove furniture with sharp corners\n• Consider a raised toilet seat\n\n**Mobility Support:**\n• Assess need for a walker or cane with an occupational therapist\n• Wear non-slip footwear (no socks on hardwood, no loose slippers)\n• Do not rush the patient — allow extra time for all transitions\n\n**Stair Safety:**\n• Install sturdy handrails on both sides\n• Mark step edges with brightly colored tape for visibility\n• Consider a stair gate if the patient tends to wander at night\n\n**Exercise for Balance:**\n• Gentle chair yoga or tai chi has been shown to reduce falls by 40–50%\n• Consult a physiotherapist for a personalized balance training program\n\n🚨 If a fall occurs: do not move the patient immediately. Assess consciousness, breathing, and visible injury before assisting.`,
  },
  {
    id: '4',
    title: 'Nutrition for Brain Health',
    category: 'Diet',
    categoryColor: '#15803d',
    categoryBg: '#dcfce7',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
    shortDescription:
      'The MIND diet has been shown to reduce Alzheimer\'s progression by up to 35% in clinical studies.',
    fullContent: `Nutrition plays a crucial role in brain health and managing Alzheimer's symptoms. The MIND Diet (Mediterranean-DASH Intervention for Neurodegenerative Delay) is specifically designed for brain health.\n\n**Brain-Boosting Foods to Include:**\n• 🫐 **Berries** – Blueberries, strawberries (at least 2 servings/week) — rich in flavonoids that reduce oxidative stress\n• 🐟 **Fatty Fish** – Salmon, sardines, mackerel (2–3×/week) — omega-3 fatty acids support neuron integrity\n• 🥦 **Leafy Greens** – Spinach, kale, broccoli (daily) — folate, vitamin K, and antioxidants\n• 🫒 **Olive Oil** – Use as primary cooking oil — oleocanthal has anti-inflammatory properties\n• 🥜 **Nuts & Seeds** – Walnuts especially (handful daily) — vitamin E and healthy fats\n• 🫘 **Legumes** – Lentils, chickpeas, beans (3+/week) — B vitamins support cognitive function\n\n**Foods to Limit:**\n• 🧈 Butter and margarine (< 1 tbsp/day)\n• 🧀 Cheese (< 1 serving/week)\n• 🍖 Red meat (< 4 servings/week)\n• 🍟 Fried/fast food (< 1 serving/week)\n• 🍰 Pastries and sweets (< 5 servings/week)\n\n**Tips for Alzheimer's Patients:**\n• Serve food with bright, contrasting plate colors (dark plate for light food) — improves food recognition\n• Offer finger foods during advanced stages\n• Ensure adequate hydration (1.5–2L water/day) — dehydration worsens confusion\n• Keep mealtimes calm and consistent\n\n💊 Supplement consideration: Vitamin D deficiency is linked to faster Alzheimer's progression. Discuss supplementation with the attending physician.`,
  },
  {
    id: '5',
    title: 'Maintaining Daily Routine Consistency',
    category: 'Mental Health',
    categoryColor: '#7c3aed',
    categoryBg: '#ede9fe',
    image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80',
    shortDescription:
      'Predictable routines are the single most effective behavioral intervention for reducing Alzheimer\'s-related anxiety.',
    fullContent: `People with Alzheimer's lose the ability to predict and plan — this creates profound anxiety. A consistent, predictable routine is the most potent tool caregivers have.\n\n**Building an Effective Daily Schedule:**\n\n🌅 **Morning (7–10 AM)**\n• Wake at the same time daily\n• Sunlight exposure within 30 minutes of waking\n• Consistent breakfast with preferred foods\n• Personal hygiene in same sequence each day\n\n☀️ **Midday (10 AM–2 PM)**\n• Mental activities (puzzles, music, conversation)\n• Light physical activity (walk, chair exercises)\n• Lunch — largest meal of the day\n• Rest period (not full sleep)\n\n🌆 **Afternoon (2–6 PM)**\n• Familiar household tasks (folding, sorting, watering plants)\n• Social visits if the patient enjoys them — limit to 1–2 hours\n• Reduce stimulation as the day progresses\n\n🌙 **Evening (6–9 PM)**\n• Light dinner at consistent time\n• Calm activities (TV, music, photo albums)\n• Begin wind-down protocol\n• Bedtime at fixed time\n\n**Why Routine Works:**\n• Reduces decision fatigue\n• Decreases anxiety and agitation episodes\n• Helps maintain circadian rhythm\n• Gives the patient a sense of control and dignity\n\n📝 Pro Tip: Create a visual daily schedule with pictures for patients who can no longer read reliably. Post it at eye level in a visible location.`,
  },
  {
    id: '6',
    title: 'Managing Caregiver Burnout',
    category: 'Mental Health',
    categoryColor: '#7c3aed',
    categoryBg: '#ede9fe',
    image: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80',
    shortDescription:
      'Over 40% of Alzheimer\'s caregivers experience clinical depression. Your wellbeing directly impacts patient care.',
    fullContent: `Caregiver burnout is a serious public health issue. The chronic stress of caring for an Alzheimer's patient — without adequate support — leads to depression, immune suppression, and deteriorating physical health.\n\n**Warning Signs of Burnout:**\n• Constant fatigue, even after rest\n• Withdrawing from friends, family, and activities you enjoy\n• Feeling resentful or overwhelmed\n• Neglecting your own health appointments\n• Emotional numbness or frequent crying\n• Trouble sleeping even when you can\n\n**Evidence-Based Strategies:**\n\n🤲 **Respite Care** – Even 4 hours of temporary relief per week significantly reduces burnout risk. Contact local Alzheimer's associations for respite programs.\n\n🧠 **Cognitive Behavioral Therapy (CBT)** – Shown in multiple trials to reduce caregiver depression by 40–50%. Many therapists now offer sessions via telehealth.\n\n👥 **Support Groups** – Connecting with others in the same situation provides validation, practical advice, and reduces isolation.\n\n📱 **Digital Tools** – Use apps for medication reminders, behavior tracking, and connecting with healthcare providers to reduce cognitive load.\n\n🏃 **Physical Exercise** – 30 minutes of moderate exercise, 5 days/week, is as effective as antidepressants for mild-to-moderate depression.\n\n💤 **Prioritize Sleep** – Arrange night-shift help if needed. Sleep deprivation is the fastest route to severe burnout.\n\n🆘 **Crisis Resources:** Contact Alzheimer's helplines — they're available 24/7 and can connect you to local support immediately.`,
  },
  {
    id: '7',
    title: 'Safe Outdoor Activities & Wandering Prevention',
    category: 'Safety',
    categoryColor: '#b45309',
    categoryBg: '#fef3c7',
    image: 'https://images.unsplash.com/photo-1476611338391-6f395a0dd82e?w=800&q=80',
    shortDescription:
      'Wandering occurs in 60% of Alzheimer\'s patients. Structured outdoor time reduces this risk while providing vital benefits.',
    fullContent: `Wandering is one of the most dangerous behaviors in Alzheimer's — and also one of the most preventable with proper management.\n\n**Why Patients Wander:**\n• Boredom or restlessness\n• Looking for something familiar (a past home or workplace)\n• Responding to hallucinations or delusions\n• Pain, hunger, or need to use the bathroom\n• Anxiety or confusion about time/place\n\n**Prevention Strategies:**\n• Install door alarms or keypads (6-digit codes rather than simple locks)\n• Use door camouflage (paint or wallpaper that makes exits less visible)\n• Place STOP signs at exit-level sight lines\n• Create a safe, enclosed garden or yard for supervised outdoor time\n\n**Safe Outdoor Time Benefits:**\n• 15–20 min of sunlight daily regulates circadian rhythm and provides vitamin D\n• Physical activity reduces restlessness that leads to wandering\n• Nature exposure reduces agitation and cortisol levels\n\n**Emergency Preparedness:**\n• Enroll in a GPS tracking/monitoring program\n• Register with local police "Project Lifesaver" or equivalent\n• Ensure the patient wears ID at all times (medical ID bracelet)\n• Have a recent photo for rapid distribution\n• Brief all neighbors about the patient's condition\n\n📍 This app's GPS monitoring feature provides real-time location tracking and geofence alerts to support wandering prevention.`,
  },
];

// ─── Category filter chips ───
const CATEGORIES = ['All', 'Mental Health', 'Sleep', 'Safety', 'Diet'];

// ─── Category icon mapping ───
const CATEGORY_ICONS: Record<string, any> = {
  'Mental Health': 'brain',
  Sleep: 'moon',
  Safety: 'shield-checkmark',
  Diet: 'nutrition',
  All: 'apps',
};

export default function LifestyleRecommendationsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter recommendations by category
  const filteredRecommendations =
    selectedCategory === 'All'
      ? RECOMMENDATIONS
      : RECOMMENDATIONS.filter((r) => r.category === selectedCategory);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1e40af', '#1e3a8a']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Lifestyle Tips</Text>
            <Text style={styles.headerSubtitle}>Alzheimer's Care Guide</Text>
          </View>
          <View style={styles.headerIconCircle}>
            <Ionicons name="heart" size={22} color="#fff" />
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={CATEGORY_ICONS[cat]}
                size={14}
                color={selectedCategory === cat ? '#1e40af' : 'rgba(255,255,255,0.8)'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Blog Feed */}
      <ScrollView
        style={styles.feed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        <Text style={styles.resultCount}>
          {filteredRecommendations.length} article
          {filteredRecommendations.length !== 1 ? 's' : ''}
        </Text>

        {filteredRecommendations.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              {/* Card Image */}
              <Image
                source={{ uri: item.image }}
                style={styles.cardImage}
                resizeMode="cover"
              />

              {/* Category Badge */}
              <View style={[styles.categoryBadge, { backgroundColor: item.categoryBg }]}>
                <Text style={[styles.categoryBadgeText, { color: item.categoryColor }]}>
                  {item.category}
                </Text>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.shortDescription}</Text>

                {/* Expanded Content */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />
                    {item.fullContent.split('\n').map((line, idx) => {
                      // Bold lines that start with **
                      const boldMatch = line.match(/^\*\*(.+)\*\*$/);
                      const hasBoldInline = line.includes('**') && !boldMatch;
                      if (boldMatch) {
                        return (
                          <Text key={idx} style={styles.contentBoldLine}>
                            {boldMatch[1]}
                          </Text>
                        );
                      }
                      if (line.trim() === '') return <View key={idx} style={{ height: 8 }} />;
                      // Bullet points
                      if (line.startsWith('• ') || line.startsWith('🌅') || line.startsWith('☀️') || line.startsWith('🌆') || line.startsWith('🌙')) {
                        return (
                          <Text key={idx} style={styles.contentBullet}>
                            {line}
                          </Text>
                        );
                      }
                      return (
                        <Text key={idx} style={styles.contentText}>
                          {line}
                        </Text>
                      );
                    })}
                  </View>
                )}

                {/* Read More / Collapse Button */}
                <TouchableOpacity
                  style={styles.readMoreBtn}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isExpanded ? ['#e2e8f0', '#cbd5e1'] : ['#1e40af', '#1e3a8a']}
                    style={styles.readMoreGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.readMoreText, isExpanded && styles.readMoreTextCollapse]}>
                      {isExpanded ? 'Show Less' : 'Read More'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={isExpanded ? '#64748b' : '#fff'}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    paddingBottom: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    gap: 6,
    marginRight: 4,
  },
  filterChipActive: {
    backgroundColor: '#fff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  filterChipTextActive: {
    color: '#1e40af',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
  },
  resultCount: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  categoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 16,
  },
  expandedContent: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },
  contentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 4,
  },
  contentBoldLine: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 10,
    marginBottom: 4,
  },
  contentBullet: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginLeft: 4,
    marginBottom: 4,
  },
  readMoreBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  readMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  readMoreTextCollapse: {
    color: '#64748b',
  },
});
