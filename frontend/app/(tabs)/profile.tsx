import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../src/constants/colors';
import { useApp } from '../../src/context/AppContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { tournaments, events, documents, taxHistory } = useApp();

  // Player data (mock for now)
  const player = {
    name: 'Lucas Martin',
    ranking: 45,
    nationality: '🇫🇷 France',
    age: 24,
    coach: 'Pierre Durand',
    agent: 'Marie Leblanc',
  };

  const stats = {
    tournamentsConfirmed: tournaments.filter(t => t.status === 'confirmed').length,
    eventsThisMonth: events.length,
    documentsStored: documents.length,
    countriesVisited: taxHistory.length,
  };

  const menuItems = [
    { icon: 'notifications-outline', label: 'Notifications', badge: 3 },
    { icon: 'people-outline', label: 'Équipe (Staff)', badge: null },
    { icon: 'settings-outline', label: 'Paramètres', badge: null },
    { icon: 'shield-checkmark-outline', label: 'Confidentialité', badge: null },
    { icon: 'help-circle-outline', label: 'Aide & Support', badge: null },
    { icon: 'information-circle-outline', label: 'À propos', badge: null },
  ];

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
              <Ionicons name="person" size={48} color="#fff" />
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{player.ranking}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerNationality}>{player.nationality}</Text>
            <View style={styles.roleTag}>
              <Ionicons name="tennisball" size={14} color={Colors.primary} />
              <Text style={styles.roleText}>Joueur Professionnel</Text>
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

        {/* Team Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon équipe</Text>
          <View style={styles.teamCard}>
            <View style={styles.teamMember}>
              <View style={[styles.teamAvatar, { backgroundColor: 'rgba(29, 161, 242, 0.1)' }]}>
                <Ionicons name="fitness" size={20} color={Colors.primary} />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamRole}>Coach</Text>
                <Text style={styles.teamName}>{player.coach}</Text>
              </View>
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.teamDivider} />
            <View style={styles.teamMember}>
              <View style={[styles.teamAvatar, { backgroundColor: 'rgba(0, 188, 212, 0.1)' }]}>
                <Ionicons name="briefcase" size={20} color="#00bcd4" />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamRole}>Agent</Text>
                <Text style={styles.teamName}>{player.agent}</Text>
              </View>
              <TouchableOpacity style={styles.contactBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.text.secondary} />
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.badge && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={Colors.text.muted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Le Central Court</Text>
          <Text style={styles.appVersion}>Version 1.0.0 (MVP)</Text>
          <Text style={styles.appCopyright}>© 2026 Central Court</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  playerNationality: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  teamCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  teamRole: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  contactBtn: {
    padding: 8,
  },
  teamDivider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginHorizontal: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  appCopyright: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 8,
  },
});
