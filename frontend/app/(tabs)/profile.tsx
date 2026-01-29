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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';
import { useApp } from '../../src/context/AppContext';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
                process.env.EXPO_PUBLIC_BACKEND_URL ||
                '';

interface Invitation {
  invitation_id: string;
  code: string;
  role: string;
  expires_at: string;
  used_count: number;
}

interface TeamMember {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { tournaments, events, documents, taxHistory } = useApp();
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'player') {
      fetchInvitations();
      fetchTeam();
    }
  }, [isAuthenticated, user]);

  const getAuthToken = async () => {
    if (Platform.OS === 'web') {
      return localStorage.getItem('session_token');
    }
    const SecureStore = require('expo-secure-store');
    return await SecureStore.getItemAsync('session_token');
  };

  const fetchInvitations = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchTeam = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/team`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeam(data);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const createInvitation = async (role: string) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchInvitations();
        
        // Share the invitation link
        const inviteUrl = `${Platform.OS === 'web' ? window.location.origin : 'centralcourt://'}/invite?code=${data.code}`;
        
        if (Platform.OS === 'web') {
          await navigator.clipboard.writeText(inviteUrl);
          Alert.alert('Lien copié', 'Le lien d\'invitation a été copié dans le presse-papiers');
        } else {
          await Share.share({
            message: `Rejoignez mon équipe sur Le Central Court en tant que ${getRoleLabel(role)}!\n\n${inviteUrl}`,
            title: 'Invitation Le Central Court'
          });
        }
        
        setShowInviteModal(false);
        setSelectedRole(null);
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const token = await getAuthToken();
      await fetch(`${API_URL}/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchInvitations();
    } catch (error) {
      console.error('Error deleting invitation:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'agent': return 'Agent';
      case 'medical': return 'Staff Médical';
      case 'technical': return 'Staff Technique';
      case 'logistics': return 'Logistique';
      default: return role;
    }
  };

  const getRoleIcon = (role: string): string => {
    switch (role) {
      case 'agent': return 'briefcase';
      case 'medical': return 'medkit';
      case 'technical': return 'fitness';
      case 'logistics': return 'airplane';
      default: return 'person';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'agent': return '#1da1f2';
      case 'medical': return '#e0245e';
      case 'technical': return '#4CAF50';
      case 'logistics': return '#ff9800';
      default: return Colors.primary;
    }
  };

  const stats = {
    tournamentsConfirmed: tournaments.filter(t => t.status === 'confirmed').length,
    eventsThisMonth: events.length,
    documentsStored: documents.length,
    countriesVisited: taxHistory.length,
  };

  const roles = [
    { id: 'agent', label: 'Agent', icon: 'briefcase', color: '#1da1f2' },
    { id: 'medical', label: 'Staff Médical', icon: 'medkit', color: '#e0245e' },
    { id: 'technical', label: 'Staff Technique', icon: 'fitness', color: '#4CAF50' },
    { id: 'logistics', label: 'Logistique', icon: 'airplane', color: '#ff9800' },
  ];

  // Demo user when not authenticated
  const displayUser = user || {
    user_id: 'demo',
    email: 'lucas.martin@tennis.fr',
    name: 'Lucas Martin',
    role: 'player' as const,
    picture: null,
  };

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
              {displayUser.picture ? (
                <Text style={styles.avatarInitial}>{displayUser.name.charAt(0)}</Text>
              ) : (
                <Ionicons name="person" size={48} color="#fff" />
              )}
            </View>
            {displayUser.role === 'player' && (
              <View style={styles.rankBadge}>
                <Ionicons name="tennisball" size={14} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.playerName}>{displayUser.name}</Text>
            <Text style={styles.playerEmail}>{displayUser.email}</Text>
            <View style={[styles.roleTag, { backgroundColor: getRoleColor(displayUser.role) }]}>
              <Ionicons name={getRoleIcon(displayUser.role) as any} size={14} color="#fff" />
              <Text style={styles.roleText}>{getRoleLabel(displayUser.role)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{stats.tournamentsConfirmed}</Text>
            <Text style={styles.statBoxLabel}>Tournois</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{stats.eventsThisMonth}</Text>
            <Text style={styles.statBoxLabel}>Événements</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{stats.documentsStored}</Text>
            <Text style={styles.statBoxLabel}>Documents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxNumber}>{stats.countriesVisited}</Text>
            <Text style={styles.statBoxLabel}>Pays</Text>
          </View>
        </View>

        {/* Team Management (Player only) */}
        {displayUser.role === 'player' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mon équipe</Text>
              <TouchableOpacity
                style={styles.addTeamBtn}
                onPress={() => setShowInviteModal(true)}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
                <Text style={styles.addTeamBtnText}>Inviter</Text>
              </TouchableOpacity>
            </View>

            {team.length === 0 ? (
              <View style={styles.emptyTeam}>
                <Ionicons name="people-outline" size={40} color={Colors.text.muted} />
                <Text style={styles.emptyTeamText}>Aucun membre dans l'équipe</Text>
                <Text style={styles.emptyTeamSubtext}>
                  Invitez votre agent, coach, kiné...
                </Text>
              </View>
            ) : (
              <View style={styles.teamCard}>
                {team.map((member, index) => (
                  <View
                    key={member.user_id}
                    style={[
                      styles.teamMember,
                      index < team.length - 1 && styles.teamMemberBorder
                    ]}
                  >
                    <View style={[styles.teamAvatar, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                      <Ionicons name={getRoleIcon(member.role) as any} size={20} color={getRoleColor(member.role)} />
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{member.name}</Text>
                      <Text style={styles.teamRole}>{getRoleLabel(member.role)}</Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn}>
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Active Invitations */}
            {invitations.length > 0 && (
              <View style={styles.invitationsSection}>
                <Text style={styles.invitationsTitle}>Invitations actives</Text>
                {invitations.map(inv => (
                  <View key={inv.invitation_id} style={styles.invitationItem}>
                    <View style={[styles.invIconContainer, { backgroundColor: getRoleColor(inv.role) + '20' }]}>
                      <Ionicons name={getRoleIcon(inv.role) as any} size={16} color={getRoleColor(inv.role)} />
                    </View>
                    <View style={styles.invInfo}>
                      <Text style={styles.invRole}>{getRoleLabel(inv.role)}</Text>
                      <Text style={styles.invUsed}>{inv.used_count} utilisations</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteInvBtn}
                      onPress={() => deleteInvitation(inv.invitation_id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="notifications-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="shield-checkmark-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Confidentialité</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="help-circle-outline" size={22} color={Colors.text.secondary} />
                <Text style={styles.menuItemLabel}>Aide & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
                <Text style={[styles.menuItemLabel, { color: Colors.danger }]}>Déconnexion</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Le Central Court</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
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

            <Text style={styles.modalSubtitle}>
              Choisissez le rôle du nouveau membre
            </Text>

            <View style={styles.rolesGrid}>
              {roles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    selectedRole === role.id && { borderColor: role.color, backgroundColor: role.color + '10' }
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                >
                  <View style={[styles.roleIconContainer, { backgroundColor: role.color + '20' }]}>
                    <Ionicons name={role.icon as any} size={28} color={role.color} />
                  </View>
                  <Text style={styles.roleCardLabel}>{role.label}</Text>
                  {selectedRole === role.id && (
                    <Ionicons name="checkmark-circle" size={20} color={role.color} style={styles.roleCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createInviteBtn, !selectedRole && styles.createInviteBtnDisabled]}
              onPress={() => selectedRole && createInvitation(selectedRole)}
              disabled={!selectedRole || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="link" size={20} color="#fff" />
                  <Text style={styles.createInviteBtnText}>Créer le lien d'invitation</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.inviteNote}>
              Le lien sera valide 7 jours et pourra être utilisé plusieurs fois
            </Text>
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
    paddingBottom: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  playerEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    marginTop: -15,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statBoxNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  statBoxLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
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
    color: Colors.text.primary,
  },
  addTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addTeamBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTeam: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTeamText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptyTeamSubtext: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  teamMemberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamInfo: {
    flex: 1,
    marginLeft: 12,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  teamRole: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  contactBtn: {
    padding: 8,
  },
  invitationsSection: {
    marginTop: 16,
  },
  invitationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  invIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invInfo: {
    flex: 1,
    marginLeft: 10,
  },
  invRole: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  invUsed: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  deleteInvBtn: {
    padding: 8,
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
    marginBottom: 20,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleCard: {
    width: '47%',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  createInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  createInviteBtnDisabled: {
    opacity: 0.5,
  },
  createInviteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteNote: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
});
