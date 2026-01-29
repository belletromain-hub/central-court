import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import Colors from '../src/constants/colors';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
                process.env.EXPO_PUBLIC_BACKEND_URL ||
                '';

interface InvitationInfo {
  valid: boolean;
  player_name: string;
  role: string;
  role_label: string;
}

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { loginWithInvitation, isAuthenticated, user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      validateInvitation();
    } else {
      setError('Code d\'invitation manquant');
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, user]);

  const validateInvitation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invitations/validate/${code}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
      } else {
        const err = await response.json();
        setError(err.detail || 'Invitation invalide');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (code) {
      await loginWithInvitation(code);
    }
  };

  const getRoleIcon = (role: string): string => {
    switch (role) {
      case 'agent': return 'briefcase';
      case 'medical': return 'medkit';
      case 'technical': return 'fitness';
      case 'logistics': return 'airplane';
      default: return 'people';
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

  if (isLoading) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Validation de l'invitation...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={80} color="#e0245e" />
          <Text style={styles.errorTitle}>Invitation invalide</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.backButtonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        {/* Invitation Card */}
        <View style={styles.invitationCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-open" size={40} color={Colors.primary} />
            <Text style={styles.cardTitle}>Invitation reçue</Text>
          </View>

          <View style={styles.playerSection}>
            <Text style={styles.playerLabel}>Vous êtes invité par</Text>
            <Text style={styles.playerName}>{invitation?.player_name}</Text>
            <Text style={styles.playerSubtext}>Joueur professionnel</Text>
          </View>

          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Rejoindre en tant que</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(invitation?.role || '') + '20' }]}>
              <Ionicons
                name={getRoleIcon(invitation?.role || '') as any}
                size={28}
                color={getRoleColor(invitation?.role || '')}
              />
              <Text style={[styles.roleText, { color: getRoleColor(invitation?.role || '') }]}>
                {invitation?.role_label}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.infoText}>Accès au calendrier partagé</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.infoText}>Messagerie avec l'équipe</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.infoText}>Documents partagés</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptInvitation}>
            <Ionicons name="logo-google" size={22} color="#333" />
            <Text style={styles.acceptButtonText}>Accepter avec Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.declineButtonText}>Décliner</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  invitationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
  },
  playerSection: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  playerLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 4,
  },
  playerSubtext: {
    fontSize: 13,
    color: Colors.text.muted,
    marginTop: 2,
  },
  roleSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  roleLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoSection: {
    paddingTop: 20,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  actionSection: {
    marginTop: 'auto',
    marginBottom: 40,
    gap: 12,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  declineButtonText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
});
