import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { fetchResidenceStats, ResidenceStats } from '../../src/services/api';

// ============ CONSTANTS ============

const USER_EMAIL_KEY = '@central_court_user_email';

const CIRCUIT_COLORS: Record<string, string> = {
  'ATP': '#1976d2',
  'WTA': '#9c27b0', 
  'ITF': '#2e7d32',
  'ITF_WHEELCHAIR': '#ff5722',
};

const LEVEL_LABELS: Record<string, string> = {
  'grand_slam': 'Grand Slam',
  '1000': 'Masters 1000',
  '500': 'ATP/WTA 500',
  '250': 'ATP/WTA 250',
  'challenger': 'Challenger',
  'itf': 'ITF',
};

const STAFF_ROLES = [
  { id: 'tennis_coach', label: 'Entraîneur Tennis', emoji: '🎾', color: '#388e3c' },
  { id: 'physical_coach', label: 'Préparateur Physique', emoji: '💪', color: '#2e7d32' },
  { id: 'physio', label: 'Kiné', emoji: '🏥', color: '#c2185b' },
  { id: 'agent', label: 'Agent', emoji: '💼', color: '#1976d2' },
  { id: 'family', label: 'Famille', emoji: '👨‍👩‍👧', color: '#ff9800' },
  { id: 'other', label: 'Autre', emoji: '👤', color: '#757575' },
];

// ============ TYPES ============

interface UserProfile {
  id: string;
  prenom: string;
  email: string;
  classement?: string;
  circuits?: string[];
  niveaux?: string[];
  residenceFiscale?: string;
  dateNaissance?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
}

// ============ COMPONENT ============

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [residenceStats, setResidenceStats] = useState<ResidenceStats | null>(null);
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form
  const [editClassement, setEditClassement] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editResidenceFiscale, setEditResidenceFiscale] = useState('');

  // ============ DATA LOADING ============

  const loadProfile = useCallback(async () => {
    try {
      const savedEmail = await AsyncStorage.getItem(USER_EMAIL_KEY);
      if (!savedEmail) {
        setIsLoading(false);
        return;
      }

      const response = await api.get(`/api/users/profile/email/${encodeURIComponent(savedEmail)}`);
      if (response.data) {
        setUserProfile(response.data);
        
        // Load team from backend
        const [staffRes, invitesRes] = await Promise.all([
          api.get(`/api/invitations/staff/player/${response.data.id}`).catch(() => ({ data: { staff: [] } })),
          api.get(`/api/invitations/player/${response.data.id}`).catch(() => ({ data: { invitations: [] } })),
        ]);
        
        const activeStaff = (staffRes.data.staff || []).map((s: any) => ({
          id: s.id,
          name: `${s.firstName}${s.lastName ? ' ' + s.lastName : ''}`,
          email: s.email,
          role: s.role,
          status: 'active' as const,
        }));
        
        const pendingInvites = (invitesRes.data.invitations || [])
          .filter((inv: any) => inv.status === 'pending')
          .map((inv: any) => ({
            id: inv.id,
            name: inv.inviteeName || inv.inviteeEmail.split('@')[0],
            email: inv.inviteeEmail,
            role: inv.role,
            status: 'pending' as const,
          }));
        
        setTeam([...activeStaff, ...pendingInvites]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  // ============ ACTIONS ============

  const openEditModal = () => {
    setEditClassement(userProfile?.classement || '');
    setEditEmail(userProfile?.email || '');
    setEditResidenceFiscale(userProfile?.residenceFiscale || '');
    setShowEditModal(true);
  };

  const saveProfile = async () => {
    if (!userProfile?.id) return;
    
    setIsSaving(true);
    try {
      await api.put(`/api/users/profile/${userProfile.id}`, {
        classement: editClassement,
        email: editEmail,
        residenceFiscale: editResidenceFiscale,
      });
      
      // Update local state
      setUserProfile(prev => prev ? {
        ...prev,
        classement: editClassement,
        email: editEmail,
        residenceFiscale: editResidenceFiscale,
      } : null);
      
      // Update stored email if changed
      if (editEmail !== userProfile.email) {
        await AsyncStorage.setItem(USER_EMAIL_KEY, editEmail);
      }
      
      setShowEditModal(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedRole || !inviteEmail || !inviteName || !userProfile?.id) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await api.post('/api/invitations/create', {
        playerId: userProfile.id,
        inviteeEmail: inviteEmail,
        inviteeName: inviteName,
        role: selectedRole,
      });
      
      const invitation = response.data;
      const roleInfo = STAFF_ROLES.find(r => r.id === selectedRole);
      const webUrl = `https://tax-days-tracker.preview.emergentagent.com/join/${invitation.token}`;
      
      // Add to local team
      setTeam(prev => [...prev, {
        id: invitation.id,
        name: inviteName,
        email: inviteEmail,
        role: selectedRole,
        status: 'pending',
      }]);
      
      // Share invitation
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(webUrl);
        Alert.alert('Invitation créée ! ✉️', `Lien copié. ${inviteName} peut rejoindre votre équipe en tant que ${roleInfo?.label}.`);
      } else {
        await Share.share({
          message: `${userProfile.prenom} vous invite à rejoindre son équipe en tant que ${roleInfo?.label}!\n\n${webUrl}`,
          title: 'Invitation Le Court Central'
        });
      }
      
      setShowInviteModal(false);
      resetInviteForm();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer l\'invitation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    Alert.alert(
      'Retirer du staff',
      `Voulez-vous retirer ${member.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (member.status === 'active') {
                await api.delete(`/api/invitations/staff/${member.id}`);
              } else {
                await api.post(`/api/invitations/${member.id}/cancel`);
              }
            } catch (e) {
              console.log('Error removing member:', e);
            }
            setTeam(prev => prev.filter(m => m.id !== member.id));
          }
        }
      ]
    );
  };

  const resetInviteForm = () => {
    setSelectedRole(null);
    setInviteEmail('');
    setInviteName('');
  };

  const getRoleInfo = (roleId: string) => STAFF_ROLES.find(r => r.id === roleId) || STAFF_ROLES[5];

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(USER_EMAIL_KEY);
              await AsyncStorage.removeItem('onboarding_completed');
              await AsyncStorage.removeItem('onboarding_data');
              router.replace('/onboarding');
            } catch (e) {
              console.error('Error during logout:', e);
            }
          },
        },
      ]
    );
  };

  // ============ RENDER HELPERS ============

  const renderCircuitBadges = () => {
    const circuits = userProfile?.circuits || [];
    if (circuits.length === 0) return null;
    
    return (
      <View style={styles.badgesRow}>
        {circuits.map(circuit => (
          <View 
            key={circuit} 
            style={[styles.badge, { backgroundColor: CIRCUIT_COLORS[circuit] || '#666' }]}
          >
            <Text style={styles.badgeText}>{circuit}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderLevelBadges = () => {
    const niveaux = userProfile?.niveaux || [];
    if (niveaux.length === 0) return null;
    
    return (
      <View style={styles.badgesRow}>
        {niveaux.map(niveau => (
          <View key={niveau} style={[styles.levelBadge]}>
            <Text style={styles.levelBadgeText}>{LEVEL_LABELS[niveau] || niveau}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ============ LOADING STATE ============

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#1e3c72" />
      </View>
    );
  }

  // ============ MAIN RENDER ============

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
              <Ionicons name="person" size={36} color="#fff" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.playerName}>{userProfile?.prenom || 'Configurer le profil'}</Text>
            
            {userProfile?.classement && (
              <View style={styles.rankingRow}>
                <Ionicons name="trophy" size={16} color="#FFD700" />
                <Text style={styles.rankingText}>#{userProfile.classement}</Text>
              </View>
            )}
            
            {renderCircuitBadges()}
            
            {userProfile?.residenceFiscale && (
              <Text style={styles.residenceText}>📍 {userProfile.residenceFiscale}</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.editBtn} onPress={openEditModal} testID="btn-edit-profile">
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Niveaux de tournois */}
        {userProfile?.niveaux && userProfile.niveaux.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Niveaux de tournois</Text>
            <View style={styles.levelsCard}>
              {renderLevelBadges()}
            </View>
          </View>
        )}

        {/* Équipe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Mon équipe</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowInviteModal(true)} testID="btn-invite">
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Inviter</Text>
            </TouchableOpacity>
          </View>

          {team.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={36} color="#999" />
              <Text style={styles.emptyTitle}>Aucun membre</Text>
              <Text style={styles.emptySubtitle}>Invitez votre coach, kiné, agent...</Text>
            </View>
          ) : (
            <View style={styles.teamCard}>
              {team.map((member, index) => {
                const roleInfo = getRoleInfo(member.role);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.teamMember, index < team.length - 1 && styles.teamMemberBorder]}
                    onLongPress={() => handleRemoveMember(member)}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: roleInfo.color + '20' }]}>
                      <Text style={styles.memberEmoji}>{roleInfo.emoji}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={[styles.memberRole, { color: roleInfo.color }]}>
                        {roleInfo.label}
                        {member.status === 'pending' && ' (en attente)'}
                      </Text>
                    </View>
                    {member.status === 'pending' && (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={14} color="#ff9800" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <Text style={styles.hint}>Appuyez longuement pour retirer un membre</Text>
        </View>

        {/* Actions rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions</Text>
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionItem} onPress={openEditModal}>
              <Ionicons name="person-outline" size={20} color="#1e3c72" />
              <Text style={styles.actionText}>Modifier mon profil</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/onboarding')}>
              <Ionicons name="refresh-outline" size={20} color="#1e3c72" />
              <Text style={styles.actionText}>Refaire l'onboarding</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleLogout} data-testid="btn-logout">
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={[styles.actionText, { color: '#E53935' }]}>Se déconnecter</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le profil</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Classement</Text>
                <TextInput
                  style={styles.formInput}
                  value={editClassement}
                  onChangeText={setEditClassement}
                  placeholder="Ex: 45"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="votre@email.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Résidence fiscale désirée</Text>
                <TextInput
                  style={styles.formInput}
                  value={editResidenceFiscale}
                  onChangeText={setEditResidenceFiscale}
                  placeholder="Ex: Monaco, Suisse..."
                  placeholderTextColor="#999"
                />
              </View>
              
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter un membre</Text>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); resetInviteForm(); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Choisir un rôle</Text>
              <View style={styles.roleGrid}>
                {STAFF_ROLES.map(role => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      selectedRole === role.id && { backgroundColor: role.color + '15', borderColor: role.color }
                    ]}
                    onPress={() => setSelectedRole(role.id)}
                  >
                    <Text style={styles.roleEmoji}>{role.emoji}</Text>
                    <Text style={[styles.roleLabel, selectedRole === role.id && { color: role.color }]}>
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
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Email</Text>
                    <TextInput
                      style={styles.formInput}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="email@example.com"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <TouchableOpacity style={styles.saveBtn} onPress={handleInvite} disabled={isSaving}>
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>Envoyer l'invitation</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  rankingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3c72',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  levelsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
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
    marginRight: 12,
  },
  memberEmoji: {
    fontSize: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberRole: {
    fontSize: 13,
    marginTop: 2,
  },
  pendingBadge: {
    padding: 6,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  saveBtn: {
    backgroundColor: '#1e3c72',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 32,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  roleCard: {
    width: '47%',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});
