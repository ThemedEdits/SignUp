// Load admin data
async function loadAdminData() {
  try {
    const response = await fetch('/api/admin/users', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Not authorized');
    }
    
    const data = await response.json();
    
    if (data.success) {
      populateUsersTable(data.users);
    }
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

// Populate users table
function populateUsersTable(users) {
  const tableBody = document.querySelector('#usersTable tbody');
  tableBody.innerHTML = '';
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.is_admin ? 'Yes' : 'No'}</td>
      <td>
        <button class="btn-action edit-user" data-id="${user.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-action delete-user" data-id="${user.id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners for action buttons
  document.querySelectorAll('.edit-user').forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.getAttribute('data-id');
      editUser(userId);
    });
  });
  
  document.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', function() {
      const userId = this.getAttribute('data-id');
      deleteUser(userId);
    });
  });
}

// Edit user function
async function editUser(userId) {
  // Implementation for editing a user
  console.log('Edit user:', userId);
  // You would typically show a modal with a form here
}

// Delete user function
async function deleteUser(userId) {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('User deleted successfully');
        loadAdminData(); // Refresh the table
      } else {
        showMessage(data.message || 'Failed to delete user', true);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('An error occurred while deleting user', true);
    }
  }
}
