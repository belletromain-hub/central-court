import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string; prenom: string; nom?: string; email: string; circuits: string[];
  classement?: number; status: string; staffCount?: number;
  activity: { lastLoginAt: string; loginCount: number; averageLoginsPerWeek: number };
  staffMembers: string[];
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [circuit, setCircuit] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<{ type: string; user: User | null }>({ type: '', user: null });
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/api/admin/users?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (circuit) url += `&circuit=${circuit}`;
      if (status) url += `&status=${status}`;
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.users || []); setTotal(data.total || 0); setTotalPages(data.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const t = await AsyncStorage.getItem('admin_token');
      if (!t) { router.replace('/admin/login'); return; }
      loadUsers();
    };
    checkAuth();
  }, [page, circuit, status]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadUsers(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getStatusColor = (user: User) => {
    if (user.status === 'suspended') return '#EF4444';
    const days = (Date.now() - new Date(user.activity.lastLoginAt).getTime()) / 86400000;
    if (days < 7) return '#10B981';
    if (days < 30) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusLabel = (user: User) => {
    if (user.status === 'suspended') return 'Suspendu';
    const days = (Date.now() - new Date(user.activity.lastLoginAt).getTime()) / 86400000;
    if (days < 7) return 'Actif';
    if (days < 30) return 'Inactif';
    return 'Tr\u00e8s inactif';
  };

  const handleAction = async (type: string) => {
    if (!actionModal.user) return;
    setActionLoading(true);
    try {
      const uid = actionModal.user.id;
      if (type === 'reset_password') {
        await fetch(`${API_BASE}/api/admin/users/${uid}/reset-password`, { method: 'POST' });
      } else if (type === 'suspend') {
        await fetch(`${API_BASE}/api/admin/users/${uid}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'suspended' }) });
      } else if (type === 'activate') {
        await fetch(`${API_BASE}/api/admin/users/${uid}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active' }) });
      } else if (type === 'delete') {
        await fetch(`${API_BASE}/api/admin/users/${uid}`, { method: 'DELETE' });
      }
      setActionModal({ type: '', user: null });
      loadUsers();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_token');
    router.replace('/admin/login');
  };

  const circuits = ['ATP', 'WTA', 'ITF', 'ITF Wheelchair'];

  return (
    <View style={s.container}>
      {/* TopBar */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <TouchableOpacity onPress={() => router.push('/admin')}>
            <Text style={s.topBarTitle}>\uD83C\uDFBE LE COURT CENTRAL</Text>
          </TouchableOpacity>
          <Text style={s.topBarTag}>Admin</Text>
        </View>
        <View style={s.topBarRight}>
          <TouchableOpacity style={s.navBtn} onPress={() => router.push('/admin')}>
            <Text style={s.navBtnText}>\uD83D\uDCCA Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutText}>D\u00e9connexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        <Text style={s.pageTitle}>\uD83D\uDC65 Utilisateurs</Text>
        <Text style={s.pageSubtitle}>{total} utilisateur{total > 1 ? 's' : ''} au total</Text>

        {/* Filters */}
        <View style={s.filtersRow}>
          <TextInput style={s.searchInput} placeholder="\uD83D\uDD0D Rechercher par nom ou email..." value={search} onChangeText={setSearch} placeholderTextColor="#9CA3AF" />
          <View style={s.filterGroup}>
            <TouchableOpacity style={[s.filterChip, !circuit && s.filterChipActive]} onPress={() => { setCircuit(''); setPage(1); }}>
              <Text style={[s.filterChipText, !circuit && s.filterChipTextActive]}>Tous</Text>
            </TouchableOpacity>
            {circuits.map(c => (
              <TouchableOpacity key={c} style={[s.filterChip, circuit === c && s.filterChipActive]} onPress={() => { setCircuit(circuit === c ? '' : c); setPage(1); }}>
                <Text style={[s.filterChipText, circuit === c && s.filterChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Users Table */}
        {loading ? <ActivityIndicator size="large" color="#2D5016" style={{ marginTop: 40 }} /> : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2.5 }]}>Utilisateur</Text>
              <Text style={[s.th, { flex: 1 }]}>Circuit</Text>
              <Text style={[s.th, { flex: 1 }]}>Statut</Text>
              <Text style={[s.th, { flex: 1 }]}>Connexions</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
            </View>
            {users.map(user => (
              <TouchableOpacity key={user.id} style={s.tableRow} onPress={() => router.push(`/admin/user/${user.id}`)}>
                <View style={[s.td, { flex: 2.5 }]}>
                  <View style={s.userInfo}>
                    <View style={[s.statusDot, { backgroundColor: getStatusColor(user) }]} />
                    <View>
                      <Text style={s.userName}>{user.prenom} {user.nom}</Text>
                      <Text style={s.userEmail}>{user.email}</Text>
                      {(user.staffCount || 0) > 0 && <Text style={s.staffBadge}>\uD83D\uDC65 {user.staffCount} staff</Text>}
                    </View>
                  </View>
                </View>
                <View style={[s.td, { flex: 1 }]}>
                  <View style={s.circuitBadge}><Text style={s.circuitText}>{user.circuits[0]}</Text></View>
                </View>
                <View style={[s.td, { flex: 1 }]}>
                  <View style={[s.statusBadge, { backgroundColor: getStatusColor(user) + '18' }]}>
                    <Text style={[s.statusText, { color: getStatusColor(user) }]}>{getStatusLabel(user)}</Text>
                  </View>
                </View>
                <View style={[s.td, { flex: 1 }]}>
                  <Text style={s.loginCount}>{Math.round(user.activity.averageLoginsPerWeek * 4.3)}/mois</Text>
                </View>
                <View style={[s.td, { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                  <TouchableOpacity style={s.actionBtn} onPress={(e) => { e.stopPropagation(); setActionModal({ type: 'reset_password', user }); }}>
                    <Text style={s.actionBtnIcon}>\uD83D\uDD12</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={(e) => { e.stopPropagation(); setActionModal({ type: user.status === 'suspended' ? 'activate' : 'suspend', user }); }}>
                    <Text style={s.actionBtnIcon}>{user.status === 'suspended' ? '\u25B6\uFE0F' : '\u23F8\uFE0F'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.deleteBtn]} onPress={(e) => { e.stopPropagation(); setActionModal({ type: 'delete', user }); }}>
                    <Text style={s.actionBtnIcon}>\uD83D\uDDD1\uFE0F</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]} onPress={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
              <Text style={s.pageBtnText}>\u2190</Text>
            </TouchableOpacity>
            <Text style={s.pageInfo}>Page {page} / {totalPages}</Text>
            <TouchableOpacity style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]} onPress={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
              <Text style={s.pageBtnText}>\u2192</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal visible={!!actionModal.type} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {actionModal.type === 'delete' && <Text style={s.modalEmoji}>\u26A0\uFE0F</Text>}
            {actionModal.type === 'reset_password' && <Text style={s.modalEmoji}>\uD83D\uDD10</Text>}
            {(actionModal.type === 'suspend' || actionModal.type === 'activate') && <Text style={s.modalEmoji}>\u23F8\uFE0F</Text>}
            <Text style={s.modalTitle}>
              {actionModal.type === 'delete' ? 'Supprimer l\'utilisateur' :
               actionModal.type === 'reset_password' ? 'R\u00e9initialiser le mot de passe' :
               actionModal.type === 'suspend' ? 'Suspendre le compte' : 'R\u00e9activer le compte'}
            </Text>
            <View style={s.modalUserBox}>
              <Text style={s.modalUserName}>{actionModal.user?.prenom} {actionModal.user?.nom}</Text>
              <Text style={s.modalUserEmail}>{actionModal.user?.email}</Text>
            </View>
            {actionModal.type === 'delete' && (
              <Text style={s.modalWarning}>\u26A0\uFE0F Cette action est irr\u00e9versible. Toutes les donn\u00e9es seront perdues.</Text>
            )}
            {actionModal.type === 'reset_password' && (
              <Text style={s.modalInfo}>Un email de r\u00e9initialisation sera envoy\u00e9 \u00e0 cette adresse.</Text>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setActionModal({ type: '', user: null })}>
                <Text style={s.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirmBtn, actionModal.type === 'delete' && { backgroundColor: '#EF4444' }]} onPress={() => handleAction(actionModal.type)} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: 17, fontWeight: '800', color: '#2D5016' },
  topBarTag: { fontSize: 11, fontWeight: '600', color: '#fff', backgroundColor: '#2D5016', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  navBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  content: { flex: 1 },
  contentInner: { padding: 24, maxWidth: 1200, alignSelf: 'center', width: '100%' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  filtersRow: { marginBottom: 20, gap: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#111827' },
  filterGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#2D5016', borderColor: '#2D5016' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterChipTextActive: { color: '#fff' },
  table: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  td: { justifyContent: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  userName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  userEmail: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  staffBadge: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  circuitBadge: { backgroundColor: '#F0F5EB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  circuitText: { fontSize: 12, fontWeight: '600', color: '#2D5016' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  loginCount: { fontSize: 14, color: '#374151', fontWeight: '500' },
  actionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  actionBtnIcon: { fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 16, color: '#374151' },
  pageInfo: { fontSize: 14, color: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', alignItems: 'center' },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  modalUserBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, width: '100%', marginBottom: 12 },
  modalUserName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  modalUserEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalWarning: { fontSize: 13, color: '#EF4444', fontWeight: '500', marginBottom: 16, textAlign: 'center' },
  modalInfo: { fontSize: 13, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#2D5016', alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
