"""
Test suite for Le Court Central Admin Dashboard API endpoints.
Tests admin authentication, metrics, user management, and activity logging.

Admin credentials: admin@lecourtcentral.com / admin123
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# ── Fixtures ──

@pytest.fixture(scope="module")
def admin_token():
    """Login and get admin token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@lecourtcentral.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    return data["token"]

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


# ══════════════════════════════════════════════════════════════════════════════
# Module 1: Admin Authentication Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestAdminAuth:
    """Test admin login and authentication"""
    
    def test_login_correct_credentials(self):
        """POST /api/admin/login - correct credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@lecourtcentral.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == "admin@lecourtcentral.com"
        assert len(data["token"]) > 50, "Token should be a valid JWT"
        print(f"✅ Admin login successful, token length: {len(data['token'])}")
    
    def test_login_wrong_password(self):
        """POST /api/admin/login - wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "admin@lecourtcentral.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"✅ Wrong password correctly rejected with 401: {data.get('detail')}")
    
    def test_login_invalid_email(self):
        """POST /api/admin/login - non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "notadmin@example.com",
            "password": "admin123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid email correctly rejected with 401")


# ══════════════════════════════════════════════════════════════════════════════
# Module 2: Metrics Dashboard Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestMetrics:
    """Test admin metrics dashboard endpoint"""
    
    def test_get_metrics_returns_all_fields(self):
        """GET /api/admin/metrics - returns users total, active, byCircuit, activation rates, engagement stats"""
        response = requests.get(f"{BASE_URL}/api/admin/metrics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check users section
        assert "users" in data, "Should have 'users' section"
        users = data["users"]
        assert "total" in users, "Should have users.total"
        assert "active" in users, "Should have users.active"
        assert "byCircuit" in users, "Should have users.byCircuit"
        assert users["total"] > 0, "Should have at least 1 user"
        print(f"  Users: total={users['total']}, active={users['active']}, circuits={users.get('byCircuit')}")
        
        # Check activation section
        assert "activation" in data, "Should have 'activation' section"
        activation = data["activation"]
        assert "onboardingCompletionRate" in activation, "Should have onboarding rate"
        assert "usersWithDocuments" in activation, "Should have usersWithDocuments"
        assert "usersWithEvents" in activation, "Should have usersWithEvents"
        assert "usersWithMembers" in activation, "Should have usersWithMembers"
        print(f"  Activation: onboarding={activation['onboardingCompletionRate']}%, docs={activation['usersWithDocuments']}")
        
        # Check engagement section
        assert "engagement" in data, "Should have 'engagement' section"
        engagement = data["engagement"]
        assert "averageLoginsPerUser" in engagement, "Should have average logins"
        assert "dailyLogins" in engagement, "Should have daily logins"
        assert "totalStaff" in engagement, "Should have total staff"
        print(f"  Engagement: avgLogins={engagement['averageLoginsPerUser']}, staff={engagement['totalStaff']}")
        
        # Check additional sections
        assert "geolocation" in data, "Should have 'geolocation' section"
        assert "documents" in data, "Should have 'documents' section"
        
        print("✅ Metrics endpoint returns all expected fields")


# ══════════════════════════════════════════════════════════════════════════════
# Module 3: Users List & Filtering Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestUsersList:
    """Test users list with search, filters, and pagination"""
    
    def test_get_users_list(self):
        """GET /api/admin/users - returns paginated users list with total count"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data, "Should have 'users' array"
        assert "total" in data, "Should have 'total' count"
        assert "page" in data, "Should have 'page' field"
        assert "totalPages" in data, "Should have 'totalPages' field"
        
        assert isinstance(data["users"], list), "Users should be a list"
        assert data["total"] > 0, "Should have at least 1 user"
        print(f"✅ Users list: {len(data['users'])} users returned, total={data['total']}, pages={data['totalPages']}")
    
    def test_filter_by_circuit_atp(self):
        """GET /api/admin/users?circuit=ATP - filters by ATP circuit"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"circuit": "ATP"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert "ATP" in user.get("circuits", []), f"User {user.get('id')} should have ATP circuit"
        
        print(f"✅ ATP filter: {len(data['users'])} users found")
    
    def test_filter_by_circuit_wta(self):
        """GET /api/admin/users?circuit=WTA - filters by WTA circuit"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"circuit": "WTA"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert "WTA" in user.get("circuits", []), f"User {user.get('id')} should have WTA circuit"
        
        print(f"✅ WTA filter: {len(data['users'])} users found")
    
    def test_search_by_name(self):
        """GET /api/admin/users?search=Thomas - searches by name"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"search": "Thomas"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1, "Should find at least 1 user named Thomas"
        
        # Verify search works
        found_thomas = any(
            "Thomas" in user.get("prenom", "") or "Thomas" in user.get("nom", "")
            for user in data["users"]
        )
        assert found_thomas, "Should find user with 'Thomas' in name"
        print(f"✅ Name search 'Thomas': {data['total']} users found")
    
    def test_search_by_email(self):
        """GET /api/admin/users?search=tennis.fr - searches by email"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"search": "tennis.fr"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1, "Should find at least 1 user with tennis.fr email"
        
        # Verify all returned users have tennis.fr in email
        for user in data["users"]:
            email = user.get("email", "").lower()
            prenom = user.get("prenom", "").lower()
            nom = user.get("nom", "").lower()
            # Search should match email, prenom, or nom
            matched = "tennis.fr" in email or "tennis.fr" in prenom or "tennis.fr" in nom
            assert matched, f"User {user.get('id')} doesn't match search 'tennis.fr'"
        
        print(f"✅ Email search 'tennis.fr': {data['total']} users found")
    
    def test_filter_by_status_suspended(self):
        """GET /api/admin/users?status=suspended - filters by status"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"status": "suspended"})
        assert response.status_code == 200
        
        data = response.json()
        for user in data["users"]:
            assert user.get("status") == "suspended", f"User {user.get('id')} should be suspended"
        
        print(f"✅ Status filter 'suspended': {data['total']} users found")
    
    def test_pagination(self):
        """GET /api/admin/users?page=1&limit=3 - pagination works"""
        response = requests.get(f"{BASE_URL}/api/admin/users", params={"page": 1, "limit": 3})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["users"]) <= 3, "Should return at most 3 users with limit=3"
        assert data["page"] == 1, "Should be on page 1"
        
        # If there are more users than limit, totalPages should be > 1
        if data["total"] > 3:
            assert data["totalPages"] > 1, f"Expected totalPages > 1 for total={data['total']}, limit=3"
        
        print(f"✅ Pagination: {len(data['users'])} users on page 1, totalPages={data['totalPages']}")


# ══════════════════════════════════════════════════════════════════════════════
# Module 4: User Detail Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestUserDetail:
    """Test user detail endpoint with staff and activity chart"""
    
    def test_get_user_001_detail(self):
        """GET /api/admin/users/user-001 - returns user detail with staff and activityChart"""
        response = requests.get(f"{BASE_URL}/api/admin/users/user-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user" in data, "Should have 'user' object"
        assert "staff" in data, "Should have 'staff' array"
        assert "activityChart" in data, "Should have 'activityChart' array"
        
        user = data["user"]
        assert user["id"] == "user-001", "Should be user-001"
        assert "prenom" in user, "User should have prenom"
        assert "email" in user, "User should have email"
        
        # Check staff is an array
        assert isinstance(data["staff"], list), "Staff should be a list"
        
        # Check activity chart has 30 days
        assert len(data["activityChart"]) == 30, "Activity chart should have 30 days"
        
        print(f"✅ User-001 detail: {user.get('prenom')} {user.get('nom')}, staff count: {len(data['staff'])}")
    
    def test_get_user_005_detail_with_staff(self):
        """GET /api/admin/users/user-005 - returns Lucas with 4 staff members"""
        response = requests.get(f"{BASE_URL}/api/admin/users/user-005")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        user = data["user"]
        staff = data["staff"]
        
        assert user.get("prenom") == "Lucas", f"Expected Lucas, got {user.get('prenom')}"
        assert len(staff) == 4, f"Lucas (user-005) should have 4 staff members, got {len(staff)}"
        
        # Verify staff structure
        for s in staff:
            assert "id" in s, "Staff should have id"
            assert "role" in s, "Staff should have role"
            assert s.get("userId") == "user-005", "Staff should belong to user-005"
        
        print(f"✅ User-005 (Lucas) detail: {len(staff)} staff members found")
    
    def test_get_nonexistent_user(self):
        """GET /api/admin/users/nonexistent-id - returns 404"""
        response = requests.get(f"{BASE_URL}/api/admin/users/nonexistent-user-xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent user correctly returns 404")


# ══════════════════════════════════════════════════════════════════════════════
# Module 5: User Status Management Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestUserStatusManagement:
    """Test user status updates (suspend/reactivate)"""
    
    def test_suspend_user(self):
        """PUT /api/admin/users/user-003/status with status=suspended - suspends user"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/user-003/status",
            json={"status": "suspended"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=true"
        assert data["user"]["status"] == "suspended", "User status should be suspended"
        
        # Verify by fetching user again
        verify_response = requests.get(f"{BASE_URL}/api/admin/users/user-003")
        assert verify_response.json()["user"]["status"] == "suspended"
        
        print("✅ User-003 suspended successfully")
    
    def test_reactivate_user(self):
        """PUT /api/admin/users/user-003/status with status=active - reactivates user"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/user-003/status",
            json={"status": "active"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["user"]["status"] == "active", "User status should be active"
        
        # Verify by fetching user again
        verify_response = requests.get(f"{BASE_URL}/api/admin/users/user-003")
        assert verify_response.json()["user"]["status"] == "active"
        
        print("✅ User-003 reactivated successfully")
    
    def test_invalid_status_returns_400(self):
        """PUT /api/admin/users/user-003/status with invalid status returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/user-003/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ Invalid status correctly rejected with 400")


# ══════════════════════════════════════════════════════════════════════════════
# Module 6: Password Reset Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestPasswordReset:
    """Test password reset for users and staff"""
    
    def test_reset_user_password(self):
        """POST /api/admin/users/user-001/reset-password - returns success message"""
        response = requests.post(f"{BASE_URL}/api/admin/users/user-001/reset-password")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=true"
        assert "message" in data, "Should have message field"
        # Email may fail in test mode, but endpoint should still return success
        print(f"✅ User password reset: {data.get('message')}")
    
    def test_reset_staff_password(self):
        """POST /api/admin/staff/sm-001/reset-password - resets staff password"""
        response = requests.post(f"{BASE_URL}/api/admin/staff/sm-001/reset-password")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=true"
        assert "message" in data, "Should have message field"
        print(f"✅ Staff password reset: {data.get('message')}")
    
    def test_reset_password_nonexistent_user(self):
        """POST /api/admin/users/nonexistent/reset-password - returns 404"""
        response = requests.post(f"{BASE_URL}/api/admin/users/nonexistent-xyz/reset-password")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Reset password for non-existent user correctly returns 404")
    
    def test_reset_password_nonexistent_staff(self):
        """POST /api/admin/staff/nonexistent/reset-password - returns 404"""
        response = requests.post(f"{BASE_URL}/api/admin/staff/nonexistent-xyz/reset-password")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Reset password for non-existent staff correctly returns 404")


# ══════════════════════════════════════════════════════════════════════════════
# Module 7: User Delete Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestUserDelete:
    """Test user soft delete functionality"""
    
    def test_delete_user(self):
        """DELETE /api/admin/users/user-008 - soft deletes user and returns deletedStaffCount"""
        # First check user exists
        check_response = requests.get(f"{BASE_URL}/api/admin/users/user-008")
        if check_response.status_code == 404:
            pytest.skip("User-008 already deleted, skipping test")
        
        response = requests.delete(f"{BASE_URL}/api/admin/users/user-008")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=true"
        assert "deletedStaffCount" in data, "Should return deletedStaffCount"
        assert "message" in data, "Should have message field"
        
        # Verify user is soft-deleted (should not appear in list)
        list_response = requests.get(f"{BASE_URL}/api/admin/users")
        users = list_response.json()["users"]
        user_ids = [u["id"] for u in users]
        assert "user-008" not in user_ids, "Deleted user should not appear in list"
        
        print(f"✅ User-008 deleted, staffCount affected: {data.get('deletedStaffCount')}")
    
    def test_delete_nonexistent_user(self):
        """DELETE /api/admin/users/nonexistent - returns 404"""
        response = requests.delete(f"{BASE_URL}/api/admin/users/nonexistent-xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Delete non-existent user correctly returns 404")


# ══════════════════════════════════════════════════════════════════════════════
# Module 8: Activity Logs Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestActivityLogs:
    """Test activity logs endpoint"""
    
    def test_get_recent_activity(self):
        """GET /api/admin/activity/recent - returns activity logs sorted by timestamp desc"""
        response = requests.get(f"{BASE_URL}/api/admin/activity/recent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "activities" in data, "Should have 'activities' array"
        assert isinstance(data["activities"], list), "Activities should be a list"
        
        activities = data["activities"]
        if len(activities) > 1:
            # Verify sorted by timestamp descending
            timestamps = [a.get("timestamp", "") for a in activities]
            assert timestamps == sorted(timestamps, reverse=True), "Should be sorted by timestamp descending"
        
        # Verify activity structure
        if activities:
            activity = activities[0]
            assert "type" in activity, "Activity should have type"
            assert "timestamp" in activity, "Activity should have timestamp"
        
        print(f"✅ Recent activity: {len(activities)} logs returned, sorted by timestamp desc")
    
    def test_activity_limit_param(self):
        """GET /api/admin/activity/recent?limit=5 - respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/admin/activity/recent", params={"limit": 5})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["activities"]) <= 5, "Should return at most 5 activities"
        print(f"✅ Activity limit=5: {len(data['activities'])} activities returned")


# ══════════════════════════════════════════════════════════════════════════════
# Run all tests
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
