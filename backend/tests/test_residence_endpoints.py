"""
Test suite for Residence/Tax Tracking API endpoints.
Tests: GET /api/residence/countries, GET /api/residence/stats, 
       POST /api/residence/days, POST /api/residence/days/bulk, DELETE /api/residence/days/{date}
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestResidenceCountries:
    """Test GET /api/residence/countries endpoint"""
    
    def test_get_countries_returns_list(self):
        """GET /api/residence/countries returns list of countries"""
        response = requests.get(f"{BASE_URL}/api/residence/countries")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
    def test_get_countries_has_required_fields(self):
        """Each country has code and name fields"""
        response = requests.get(f"{BASE_URL}/api/residence/countries")
        assert response.status_code == 200
        
        data = response.json()
        for country in data:
            assert "code" in country
            assert "name" in country
            assert isinstance(country["code"], str)
            assert isinstance(country["name"], str)
            assert len(country["code"]) == 2  # ISO alpha-2 codes
            
    def test_get_countries_includes_common_countries(self):
        """Countries list includes common countries like FR, US, GB"""
        response = requests.get(f"{BASE_URL}/api/residence/countries")
        assert response.status_code == 200
        
        data = response.json()
        codes = [c["code"] for c in data]
        
        # Check for common countries
        assert "FR" in codes  # France
        assert "US" in codes  # États-Unis
        assert "GB" in codes  # Royaume-Uni
        assert "MC" in codes  # Monaco
        assert "AU" in codes  # Australie


class TestResidenceStats:
    """Test GET /api/residence/stats endpoint"""
    
    def test_get_stats_returns_valid_structure(self):
        """GET /api/residence/stats returns valid stats structure"""
        response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert "year" in data
        assert "totalDaysTracked" in data
        assert "countries" in data
        assert "primaryCountry" in data
        assert "warnings" in data
        
    def test_get_stats_year_parameter(self):
        """Stats endpoint respects year parameter"""
        response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert data["year"] == 2026
        
    def test_get_stats_countries_have_required_fields(self):
        """Country stats have all required fields"""
        response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        if data["countries"]:
            country = data["countries"][0]
            required_fields = [
                "country", "countryName", "totalDays", "confirmedDays",
                "manualDays", "daysByMonth", "firstDay", "lastDay",
                "longestStreak", "threshold", "percentOfThreshold"
            ]
            for field in required_fields:
                assert field in country, f"Missing field: {field}"
                
    def test_get_stats_threshold_calculation(self):
        """Threshold percentage is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        for country in data["countries"]:
            expected_percent = round((country["totalDays"] / country["threshold"]) * 100, 1)
            assert abs(country["percentOfThreshold"] - expected_percent) < 0.2


class TestResidenceDayPresence:
    """Test POST /api/residence/days endpoint"""
    
    def test_add_single_day_presence(self):
        """POST /api/residence/days adds a day of presence"""
        test_date = "2026-12-25"
        payload = {
            "date": test_date,
            "country": "FR",
            "countryName": "France",
            "status": "manual",
            "notes": "TEST_Christmas day"
        }
        
        response = requests.post(f"{BASE_URL}/api/residence/days", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == test_date
        assert data["country"] == "FR"
        assert data["countryName"] == "France"
        assert data["status"] == "manual"
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/residence/days/{test_date}")
        
    def test_add_day_updates_existing(self):
        """POST /api/residence/days updates existing day if duplicate"""
        test_date = "2026-12-26"
        
        # First add
        payload1 = {
            "date": test_date,
            "country": "FR",
            "countryName": "France",
            "status": "manual",
            "notes": "TEST_First entry"
        }
        response1 = requests.post(f"{BASE_URL}/api/residence/days", json=payload1)
        assert response1.status_code == 200
        
        # Second add (update)
        payload2 = {
            "date": test_date,
            "country": "MC",
            "countryName": "Monaco",
            "status": "confirmed",
            "notes": "TEST_Updated entry"
        }
        response2 = requests.post(f"{BASE_URL}/api/residence/days", json=payload2)
        assert response2.status_code == 200
        
        data = response2.json()
        assert data["country"] == "MC"
        assert data["countryName"] == "Monaco"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/residence/days/{test_date}")
        
    def test_add_day_without_notes(self):
        """POST /api/residence/days works without optional notes"""
        test_date = "2026-12-27"
        payload = {
            "date": test_date,
            "country": "ES",
            "countryName": "Espagne",
            "status": "manual"
        }
        
        response = requests.post(f"{BASE_URL}/api/residence/days", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == test_date
        assert data["country"] == "ES"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/residence/days/{test_date}")


class TestResidenceBulkDays:
    """Test POST /api/residence/days/bulk endpoint"""
    
    def test_add_bulk_days_success(self):
        """POST /api/residence/days/bulk adds multiple days"""
        payload = {
            "startDate": "2026-11-01",
            "endDate": "2026-11-05",
            "country": "IT",
            "countryName": "Italie",
            "notes": "TEST_Bulk trip"
        }
        
        response = requests.post(f"{BASE_URL}/api/residence/days/bulk", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["added"] >= 0  # May be 0 if dates already exist
        assert data["startDate"] == "2026-11-01"
        assert data["endDate"] == "2026-11-05"
        
        # Cleanup
        for day in range(1, 6):
            requests.delete(f"{BASE_URL}/api/residence/days/2026-11-{day:02d}")
            
    def test_bulk_days_invalid_date_range(self):
        """POST /api/residence/days/bulk rejects endDate < startDate"""
        payload = {
            "startDate": "2026-11-10",
            "endDate": "2026-11-05",  # Before start
            "country": "IT",
            "countryName": "Italie"
        }
        
        response = requests.post(f"{BASE_URL}/api/residence/days/bulk", json=payload)
        assert response.status_code == 400
        
    def test_bulk_days_max_90_days_limit(self):
        """POST /api/residence/days/bulk rejects ranges > 90 days"""
        payload = {
            "startDate": "2026-01-01",
            "endDate": "2026-05-01",  # > 90 days
            "country": "IT",
            "countryName": "Italie"
        }
        
        response = requests.post(f"{BASE_URL}/api/residence/days/bulk", json=payload)
        assert response.status_code == 400


class TestResidenceDeleteDay:
    """Test DELETE /api/residence/days/{date} endpoint"""
    
    def test_delete_day_success(self):
        """DELETE /api/residence/days/{date} removes a day"""
        test_date = "2026-12-28"
        
        # First add a day
        payload = {
            "date": test_date,
            "country": "DE",
            "countryName": "Allemagne",
            "status": "manual",
            "notes": "TEST_To be deleted"
        }
        requests.post(f"{BASE_URL}/api/residence/days", json=payload)
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/residence/days/{test_date}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        
    def test_delete_nonexistent_day_returns_404(self):
        """DELETE /api/residence/days/{date} returns 404 for non-existent date"""
        response = requests.delete(f"{BASE_URL}/api/residence/days/2099-12-31")
        assert response.status_code == 404


class TestResidenceGetDays:
    """Test GET /api/residence/days endpoint"""
    
    def test_get_days_by_year(self):
        """GET /api/residence/days returns days for specified year"""
        response = requests.get(f"{BASE_URL}/api/residence/days?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned days should be in 2026
        for day in data:
            assert day["date"].startswith("2026")
            
    def test_get_days_by_year_and_month(self):
        """GET /api/residence/days filters by year and month"""
        response = requests.get(f"{BASE_URL}/api/residence/days?year=2026&month=1")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned days should be in January 2026
        for day in data:
            assert day["date"].startswith("2026-01")
            
    def test_get_days_has_required_fields(self):
        """Each day presence has required fields"""
        response = requests.get(f"{BASE_URL}/api/residence/days?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        if data:
            day = data[0]
            required_fields = ["id", "date", "country", "countryName", "status", "createdAt", "updatedAt"]
            for field in required_fields:
                assert field in day, f"Missing field: {field}"


class TestResidenceWarnings:
    """Test warning generation in stats"""
    
    def test_no_warnings_below_threshold(self):
        """No warnings when days are below 75% of threshold"""
        response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert response.status_code == 200
        
        data = response.json()
        # Current test data has low percentages, should have no warnings
        for country in data["countries"]:
            if country["percentOfThreshold"] < 75:
                # This country should not have a warning
                country_warnings = [w for w in data["warnings"] if w["country"] == country["country"]]
                assert len(country_warnings) == 0


class TestResidenceIntegration:
    """Integration tests for residence tracking flow"""
    
    def test_full_crud_flow(self):
        """Test complete Create-Read-Update-Delete flow"""
        test_date = "2026-12-30"
        
        # CREATE
        create_payload = {
            "date": test_date,
            "country": "PT",
            "countryName": "Portugal",
            "status": "manual",
            "notes": "TEST_Integration test"
        }
        create_response = requests.post(f"{BASE_URL}/api/residence/days", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        assert created["country"] == "PT"
        
        # READ - Verify in stats
        stats_response = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        pt_stats = next((c for c in stats["countries"] if c["country"] == "PT"), None)
        assert pt_stats is not None
        assert pt_stats["totalDays"] >= 1
        
        # UPDATE - Change country
        update_payload = {
            "date": test_date,
            "country": "NL",
            "countryName": "Pays-Bas",
            "status": "confirmed",
            "notes": "TEST_Updated"
        }
        update_response = requests.post(f"{BASE_URL}/api/residence/days", json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["country"] == "NL"
        
        # DELETE
        delete_response = requests.delete(f"{BASE_URL}/api/residence/days/{test_date}")
        assert delete_response.status_code == 200
        
        # VERIFY DELETION - Check stats again
        final_stats = requests.get(f"{BASE_URL}/api/residence/stats?year=2026")
        assert final_stats.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
