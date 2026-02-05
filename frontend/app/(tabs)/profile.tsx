import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../src/constants/colors';

// Staff roles selon specs V1
const STAFF_ROLES = [
  { 
    id: 'tennis_coach', 
    label: 'Entraîneur Tennis', 
    icon: 'tennisball',
    emoji: '🎾',
    color: '#388e3c',
    permissions: ['training_tennis', 'tournament']
  },
  { 
    id: 'physical_coach', 
    label: 'Préparateur Physique', 
    icon: 'barbell',
    emoji: '💪',
    color: '#2e7d32',
    permissions: ['training_physical', 'medical_kine']
  },
  { 
    id: 'physio', 
    label: 'Kiné', 
    icon: 'medkit',
    emoji: '🏥',
    color: '#c2185b',
    permissions: ['medical_kine', 'training_tennis', 'training_physical']
  },
  { 
    id: 'agent', 
    label: 'Agent', 
    icon: 'briefcase',
    emoji: '💼',
    color: '#1976d2',
    permissions: ['sponsor', 'media', 'tournament', 'travel']
  },
  { 
    id: 'family', 
    label: 'Famille', 
    icon: 'people',
    emoji: '👨‍👩‍👧',
    color: '#ff9800',
    permissions: ['all_except_personal']
  },
  { 
    id: 'other', 
    label: 'Autre', 
    icon: 'person',
    emoji: '👤',
    color: '#757575',
    permissions: []
  },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  addedAt: string;
}

interface TravelDay {
  country: string;
  flag: string;
  days: number;
}

const PROFILE_STORAGE_KEY = '@central_court_player_profile';
const TEAM_STORAGE_KEY = '@central_court_team';
const TRAVEL_STORAGE_KEY = '@central_court_travel_days';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [playerProfile, setPlayerProfile] = useState<any>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [travelDays, setTravelDays] = useState<TravelDay[]>([
    { country: 'France', flag: '🇫🇷', days: 20 },
    { country: 'Monaco', flag: '🇲🇨', days: 5 },
    { country: 'Australie', flag: '🇦🇺', days: 3 },
  ]);
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [profileData, teamData, travelData] = await Promise.all([
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        AsyncStorage.getItem(TEAM_STORAGE_KEY),
        AsyncStorage.getItem(TRAVEL_STORAGE_KEY),
      ]);
      
      if (profileData) setPlayerProfile(JSON.parse(profileData));
      if (teamData) setTeam(JSON.parse(teamData));
      if (travelData) setTravelDays(JSON.parse(travelData));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  
  const saveTeam = async (newTeam: TeamMember[]) => {
    setTeam(newTeam);
    await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(newTeam));
  };
  
  const handleInvite = async () => {
    if (!selectedRole || !inviteEmail || !inviteName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate invitation creation
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: selectedRole,
      addedAt: new Date().toISOString(),
    };
    
    await saveTeam([...team, newMember]);
    
    // Share invitation link
    const inviteUrl = `centralcourt://invite?role=${selectedRole}`;
    const roleInfo = STAFF_ROLES.find(r => r.id === selectedRole);
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(inviteUrl);
        Alert.alert('Invitation créée', `${inviteName} a été ajouté(e) comme ${roleInfo?.label}`);
      } else {
        await Share.share({
          message: `${playerProfile?.firstName || 'Un joueur'} vous invite à rejoindre son équipe sur Tennis Assistant en tant que ${roleInfo?.label}!\n\nTéléchargez l'app et utilisez ce lien: ${inviteUrl}`,
          title: 'Invitation Tennis Assistant'
        });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
    
    setShowInviteModal(false);
    setSelectedRole(null);
    setInviteEmail('');
    setInviteName('');
    setIsLoading(false);
  };
  
  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      'Retirer du staff',
      `Voulez-vous retirer ${memberName} de votre équipe ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Retirer', 
          style: 'destructive',
          onPress: () => saveTeam(team.filter(m => m.id !== memberId))
        }
      ]
    );
  };
  
  const getRoleInfo = (roleId: string) => {
    return STAFF_ROLES.find(r => r.id === roleId) || STAFF_ROLES[5];
  };
  
  const totalTravelDays = travelDays.reduce((sum, t) => sum + t.days, 0);
  
  // Display name
  const displayName = playerProfile?.firstName && playerProfile?.lastName
    ? `${playerProfile.firstName} ${playerProfile.lastName}`
    : 'Joueur Tennis';
  
  const displayEmail = playerProfile?.email || 'Configurer le profil';
  const displayCircuit = playerProfile?.circuit || 'ATP';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e3c72', '#2a5298']}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.circuitBadge}>
              <Text style={styles.circuitBadgeText}>{displayCircuit}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.playerName}>{displayName}</Text>
            <Text style={styles.playerEmail}>{displayEmail}</Text>
            {playerProfile?.currentRanking && (
              <View style={styles.rankingTag}>
                <Ionicons name="trophy" size={14} color="#FFD700" />
                <Text style={styles.rankingText}>Classement: #{playerProfile.currentRanking}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => router.push('/onboarding')}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Team Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Mon équipe</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Inviter</Text>
            </TouchableOpacity>
          </View>

          {team.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color={Colors.text.muted} />
              <Text style={styles.emptyTitle}>Aucun membre</Text>
              <Text style={styles.emptySubtitle}>
                Invitez votre coach, kiné, agent...
              </Text>
            </View>
          ) : (
            <View style={styles.teamCard}>
              {team.map((member, index) => {
                const roleInfo = getRoleInfo(member.role);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.teamMember,
                      index < team.length - 1 && styles.teamMemberBorder
                    ]}
                    onLongPress={() => handleRemoveMember(member.id, member.name)}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: roleInfo.color + '20' }]}>
                      <Text style={styles.memberEmoji}>{roleInfo.emoji}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={[styles.memberRole, { color: roleInfo.color }]}>
                        {roleInfo.label}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.memberAction}>
                      <Ionicons name="mail-outline" size={20} color={Colors.text.muted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          
          <Text style={styles.teamNote}>
            Appuyez longuement sur un membre pour le retirer
          </Text>
        </View>

        {/* Travel Days (Jours de voyage) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✈️ Jours de voyage</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => setShowTravelModal(true)}
            >
              <Text style={styles.viewAllText}>Voir tout</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.travelCard}>
            <View style={styles.travelSummary}>
              <Text style={styles.travelTotal}>{totalTravelDays}</Text>
              <Text style={styles.travelLabel}>jours en 2026</Text>
            </View>
            <View style={styles.travelCountries}>
              {travelDays.slice(0, 3).map(travel => (
                <View key={travel.country} style={styles.travelItem}>
                  <Text style={styles.travelFlag}>{travel.flag}</Text>
                  <Text style={styles.travelDays}>{travel.days}j</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Paramètres</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => router.push('/onboarding')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="person-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Modifier mon profil</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="help-circle-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Aide & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>🎾 Tennis Assistant</Text>
          <Text style={styles.appVersion}>Version 1.0.0 - MVP</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter un membre</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Choisissez le rôle</Text>

            <ScrollView style={styles.rolesScroll} showsVerticalScrollIndicator={false}>
              {STAFF_ROLES.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleOption,
                    selectedRole === role.id && { borderColor: role.color, backgroundColor: role.color + '10' }
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={styles.roleLabel}>{role.label}</Text>
                  </View>
                  {selectedRole === role.id && (
                    <Ionicons name="checkmark-circle" size={22} color={role.color} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedRole && (
              <View style={styles.inviteForm}>
                <Text style={styles.inputLabel}>Nom *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="Patrick Mouratoglou"
                  placeholderTextColor={Colors.text.muted}
                />
                
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="coach@email.com"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.inviteBtn,
                (!selectedRole || !inviteEmail || !inviteName) && styles.inviteBtnDisabled
              ]}
              onPress={handleInvite}
              disabled={!selectedRole || !inviteEmail || !inviteName || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.inviteBtnText}>Envoyer l'invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Travel Days Modal */}
      <Modal visible={showTravelModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Jours de voyage 2026</Text>
              <TouchableOpacity onPress={() => setShowTravelModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.travelModalSummary}>
              <Text style={styles.travelModalTotal}>{totalTravelDays}</Text>
              <Text style={styles.travelModalLabel}>jours au total</Text>
            </View>

            <ScrollView style={styles.travelList}>
              {travelDays.map(travel => (
                <View key={travel.country} style={styles.travelListItem}>
                  <Text style={styles.travelListFlag}>{travel.flag}</Text>
                  <Text style={styles.travelListCountry}>{travel.country}</Text>
                  <Text style={styles.travelListDays}>{travel.days} jours</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.travelNote}>
              <Ionicons name="information-circle" size={18} color={Colors.text.secondary} />
              <Text style={styles.travelNoteText}>
                Comptage manuel pour V1. La géolocalisation automatique sera disponible prochainement.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  circuitBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  circuitBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  playerEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  rankingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  rankingText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  editBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    marginTop: -8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  teamMemberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberEmoji: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberAction: {
    padding: 8,
  },
  teamNote: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  travelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelSummary: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: Colors.border.light,
  },
  travelTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  travelLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  travelCountries: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 16,
  },
  travelItem: {
    alignItems: 'center',
  },
  travelFlag: {
    fontSize: 24,
  },
  travelDays: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    paddingVertical: 16,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  appVersion: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  rolesScroll: {
    maxHeight: 250,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleEmoji: {
    fontSize: 20,
  },
  roleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inviteForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  inviteBtnDisabled: {
    opacity: 0.5,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Travel modal
  travelModalSummary: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  travelModalTotal: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  travelModalLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  travelList: {
    maxHeight: 300,
    marginTop: 16,
  },
  travelListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  travelListFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  travelListCountry: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  travelListDays: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  travelNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  travelNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});
