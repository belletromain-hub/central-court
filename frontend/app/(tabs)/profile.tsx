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
import api from '../../src/services/api';

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

interface UserProfile {
  id?: string;
  prenom: string;
  email: string;
  classement?: string;
  circuits?: string[];
  residenceFiscale?: string;
}

const TEAM_STORAGE_KEY = '@central_court_team';
const TRAVEL_STORAGE_KEY = '@central_court_travel_days';
const USER_EMAIL_KEY = '@central_court_user_email';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [travelDays, setTravelDays] = useState<TravelDay[]>([
    { country: 'France', flag: '🇫🇷', days: 20 },
    { country: 'Monaco', flag: '🇲🇨', days: 5 },
    { country: 'Australie', flag: '🇦🇺', days: 3 },
  ]);
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit profile state
  const [editClassement, setEditClassement] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editResidenceFiscale, setEditResidenceFiscale] = useState('');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoadingProfile(true);
      
      // Load team and travel from local storage
      const [teamData, travelData, savedEmail] = await Promise.all([
        AsyncStorage.getItem(TEAM_STORAGE_KEY),
        AsyncStorage.getItem(TRAVEL_STORAGE_KEY),
        AsyncStorage.getItem(USER_EMAIL_KEY),
      ]);
      
      if (teamData) setTeam(JSON.parse(teamData));
      if (travelData) setTravelDays(JSON.parse(travelData));
      
      // Try to load profile from backend
      if (savedEmail) {
        try {
          const response = await api.get(`/api/users/profile/email/${encodeURIComponent(savedEmail)}`);
          if (response.data) {
            setUserProfile(response.data);
          }
        } catch (e) {
          console.log('Profile not found in backend');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };
  
  const saveTeam = async (newTeam: TeamMember[]) => {
    setTeam(newTeam);
    await AsyncStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(newTeam));
  };
  
  const openEditProfile = () => {
    setEditClassement(userProfile?.classement || '');
    setEditEmail(userProfile?.email || '');
    setEditResidenceFiscale(userProfile?.residenceFiscale || '');
    setShowEditProfileModal(true);
  };
  
  const saveProfile = async () => {
    if (!editEmail) {
      Alert.alert('Erreur', 'L\'email est requis');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Update profile in backend
      const response = await api.post('/api/users/onboarding', {
        prenom: userProfile?.prenom || '',
        email: editEmail,
        classement: editClassement,
        residenceFiscale: editResidenceFiscale,
        circuits: userProfile?.circuits || [],
        onboardingCompleted: true,
      });
      
      if (response.data) {
        setUserProfile(response.data);
        // Save email for future loads
        await AsyncStorage.setItem(USER_EMAIL_KEY, editEmail);
      }
      
      setShowEditProfileModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInvite = async () => {
    if (!selectedRole || !inviteEmail || !inviteName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setIsLoading(true);
    
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: inviteName,
      email: inviteEmail,
      role: selectedRole,
      addedAt: new Date().toISOString(),
    };
    
    await saveTeam([...team, newMember]);
    
    const inviteUrl = `centralcourt://invite?role=${selectedRole}`;
    const roleInfo = STAFF_ROLES.find(r => r.id === selectedRole);
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(inviteUrl);
        Alert.alert('Invitation créée', `${inviteName} a été ajouté(e) comme ${roleInfo?.label}`);
      } else {
        await Share.share({
          message: `${userProfile?.prenom || 'Un joueur'} vous invite à rejoindre son équipe sur Le Court Central en tant que ${roleInfo?.label}!\n\nTéléchargez l'app et utilisez ce lien: ${inviteUrl}`,
          title: 'Invitation Le Court Central'
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
  
  // Display values
  const displayName = userProfile?.prenom || 'Configurer le profil';
  const displayClassement = userProfile?.classement || '--';
  const displayCircuit = userProfile?.circuits?.[0] || 'ATP';

  return (
    <View style={styles.container}>
      {/* Header with name and ranking */}
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
            {/* Classement prominent display */}
            <View style={styles.rankingContainer}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <Text style={styles.rankingNumber}>#{displayClassement}</Text>
            </View>
            {userProfile?.residenceFiscale && (
              <Text style={styles.residenceText}>📍 {userProfile.residenceFiscale}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={openEditProfile}
            testID="btn-edit-profile"
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
              testID="btn-invite-team"
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

        {/* Travel Days */}
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
              onPress={openEditProfile}
              testID="menu-edit-profile"
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="person-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Mettre à jour mon profil</Text>
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
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Confidentialité</Text>
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
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editProfileModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mettre à jour mon profil</Text>
              <TouchableOpacity 
                onPress={() => setShowEditProfileModal(false)}
                testID="close-edit-profile"
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
              {/* Classement */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="trophy" size={16} color="#FFD700" /> Classement
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editClassement}
                  onChangeText={setEditClassement}
                  placeholder="Ex: 45"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="number-pad"
                  testID="input-classement"
                />
                <Text style={styles.formHint}>Votre classement ATP/WTA actuel</Text>
              </View>
              
              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="mail" size={16} color={Colors.primary} /> Adresse email
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-email"
                />
              </View>
              
              {/* Résidence fiscale */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  <Ionicons name="location" size={16} color="#4CAF50" /> Résidence fiscale désirée
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={editResidenceFiscale}
                  onChangeText={setEditResidenceFiscale}
                  placeholder="Ex: Monaco, Suisse, Dubaï..."
                  placeholderTextColor={Colors.text.muted}
                  testID="input-residence"
                />
                <Text style={styles.formHint}>Pays où vous souhaitez établir votre résidence fiscale</Text>
              </View>
              
              {/* Save Button */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveProfile}
                disabled={isLoading}
                testID="btn-save-profile"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Invite Team Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.inviteModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter un membre</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Role Selection */}
              <Text style={styles.formLabel}>Choisir un rôle</Text>
              <View style={styles.roleGrid}>
                {STAFF_ROLES.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      selectedRole === role.id && { 
                        backgroundColor: role.color + '15',
                        borderColor: role.color 
                      }
                    ]}
                    onPress={() => setSelectedRole(role.id)}
                  >
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                    <Text style={[
                      styles.roleLabel,
                      selectedRole === role.id && { color: role.color }
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {selectedRole && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Nom</Text>
                    <TextInput
                      style={styles.formInput}
                      value={inviteName}
                      onChangeText={setInviteName}
                      placeholder="Prénom Nom"
                      placeholderTextColor={Colors.text.muted}
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Email</Text>
                    <TextInput
                      style={styles.formInput}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="email@example.com"
                      placeholderTextColor={Colors.text.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.inviteButton}
                    onPress={handleInvite}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.inviteButtonText}>Envoyer l'invitation</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Travel Days Modal */}
      <Modal visible={showTravelModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.travelModal}>
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
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {travelDays.map(travel => (
                <View key={travel.country} style={styles.travelModalItem}>
                  <Text style={styles.travelModalFlag}>{travel.flag}</Text>
                  <Text style={styles.travelModalCountry}>{travel.country}</Text>
                  <Text style={styles.travelModalDays}>{travel.days} jours</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  circuitBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  circuitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  rankingNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  residenceText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  teamMemberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 13,
    marginTop: 2,
  },
  memberAction: {
    padding: 8,
  },
  teamNote: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  travelCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelSummary: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  travelTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  travelLabel: {
    fontSize: 12,
    color: Colors.text.muted,
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
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
    borderBottomColor: '#f0f0f0',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  // Edit Profile Modal
  editProfileModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  editForm: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  formHint: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Invite Modal
  inviteModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    width: '31%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Travel Modal
  travelModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  travelModalSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  travelModalTotal: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  travelModalLabel: {
    fontSize: 14,
    color: Colors.text.muted,
  },
  travelModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  travelModalFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  travelModalCountry: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  travelModalDays: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
});
