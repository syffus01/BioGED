import requests
import json
import os
import time
from datetime import datetime
import tempfile
import random
import string

class PharmaVaultAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_document_id = None
        self.test_results = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, data=data, files=files)
                else:
                    response = requests.post(url, headers=headers, json=data)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        self.test_results["health_check"] = success
        return success

    def test_register(self):
        """Test user registration"""
        # Generate random user data
        random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        email = f"test_user_{random_suffix}@example.com"
        password = "TestPassword123!"
        
        user_data = {
            "email": email,
            "password": password,
            "full_name": "Test Quality Manager",
            "role": "QualityManager",
            "department": "Quality Assurance"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success:
            self.test_user_email = email
            self.test_user_password = password
            
        self.test_results["registration"] = success
        return success

    def test_login(self):
        """Test login and get token"""
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"Logged in as {self.user_data['full_name']} ({self.user_data['role']})")
            
        self.test_results["login"] = success
        return success

    def test_dashboard(self):
        """Test dashboard data retrieval"""
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            print(f"Dashboard stats: {response['stats']}")
            
        self.test_results["dashboard"] = success
        return success

    def test_document_upload(self):
        """Test document upload"""
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp:
            temp.write(b"This is a test document for PharmaVault EDMS testing.")
            temp_path = temp.name
        
        # Prepare form data
        form_data = {
            "title": "Test SOP Document",
            "description": "This is a test SOP document for API testing",
            "document_type": "SOP",
            "category": "Quality Control",
            "tags": "test,api,quality"
        }
        
        # Prepare file
        files = {
            'file': ('test_document.txt', open(temp_path, 'rb'), 'text/plain')
        }
        
        success, response = self.run_test(
            "Document Upload",
            "POST",
            "documents/upload",
            200,
            data=form_data,
            files=files
        )
        
        # Clean up the temporary file
        os.unlink(temp_path)
        
        if success and 'document_id' in response:
            self.test_document_id = response['document_id']
            print(f"Uploaded document ID: {self.test_document_id}")
            
        self.test_results["document_upload"] = success
        return success

    def test_get_documents(self):
        """Test retrieving documents list"""
        success, response = self.run_test(
            "Get Documents",
            "GET",
            "documents",
            200
        )
        
        if success:
            print(f"Retrieved {len(response['documents'])} documents")
            
        self.test_results["get_documents"] = success
        return success

    def test_get_document_by_id(self):
        """Test retrieving a specific document"""
        if not self.test_document_id:
            print("❌ No test document ID available")
            self.test_results["get_document_by_id"] = False
            return False
            
        success, response = self.run_test(
            "Get Document by ID",
            "GET",
            f"documents/{self.test_document_id}",
            200
        )
        
        self.test_results["get_document_by_id"] = success
        return success

    def test_document_approval(self):
        """Test document approval workflow"""
        if not self.test_document_id:
            print("❌ No test document ID available")
            self.test_results["document_approval"] = False
            return False
            
        # Get the document to check workflow steps
        _, document = self.run_test(
            "Get Document for Approval",
            "GET",
            f"documents/{self.test_document_id}",
            200
        )
        
        if not document or 'approval_workflow' not in document:
            print("❌ Document doesn't have approval workflow")
            self.test_results["document_approval"] = False
            return False
            
        # Approve the first step
        approval_data = {
            "step_index": 0,
            "comments": "Approved during API testing"
        }
        
        success, response = self.run_test(
            "Approve Document Step",
            "POST",
            f"documents/{self.test_document_id}/approve",
            200,
            data=approval_data
        )
        
        self.test_results["document_approval"] = success
        return success

    def test_search_documents(self):
        """Test document search functionality"""
        search_params = {
            "q": "Test"
        }
        
        success, response = self.run_test(
            "Search Documents",
            "GET",
            "search",
            200,
            params=search_params
        )
        
        if success:
            print(f"Search found {len(response['results'])} documents")
            
        self.test_results["search_documents"] = success
        return success

    def test_audit_logs(self):
        """Test audit logs retrieval"""
        success, response = self.run_test(
            "Audit Logs",
            "GET",
            "audit",
            200
        )
        
        if success:
            print(f"Retrieved {len(response['logs'])} audit logs")
            
        self.test_results["audit_logs"] = success
        return success

    def test_document_types(self):
        """Test document types configuration"""
        success, response = self.run_test(
            "Document Types",
            "GET",
            "config/document-types",
            200
        )
        
        if success:
            print(f"Retrieved {len(response['document_types'])} document types")
            
        self.test_results["document_types"] = success
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting PharmaVault API Tests")
        
        # Basic health check
        self.test_health()
        
        # Authentication tests
        if self.test_register():
            if not self.test_login():
                print("❌ Login failed, stopping tests")
                return self.get_results()
        else:
            print("❌ Registration failed, stopping tests")
            return self.get_results()
        
        # Dashboard test
        self.test_dashboard()
        
        # Document management tests
        self.test_document_upload()
        self.test_get_documents()
        self.test_get_document_by_id()
        
        # Workflow test
        self.test_document_approval()
        
        # Search test
        self.test_search_documents()
        
        # Audit test
        self.test_audit_logs()
        
        # Configuration test
        self.test_document_types()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n📊 Test Results Summary:")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        for test_name, result in self.test_results.items():
            status = "✅ Passed" if result else "❌ Failed"
            print(f"{test_name}: {status}")
            
        return {
            "total": self.tests_run,
            "passed": self.tests_passed,
            "results": self.test_results
        }

if __name__ == "__main__":
    # Get the backend URL from the environment or use the default
    backend_url = "https://384f9436-da75-4a77-8193-89e840039f68.preview.emergentagent.com"
    
    # Run the tests
    tester = PharmaVaultAPITester(backend_url)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    exit_code = 0 if results["passed"] == results["total"] else 1
    exit(exit_code)