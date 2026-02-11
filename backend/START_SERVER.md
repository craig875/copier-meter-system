# How to Start the Server

## Quick Start

1. **Open PowerShell in the backend directory:**
   ```powershell
   cd C:\Users\27620\copier-meter-system\backend
   ```

2. **Start the server:**
   ```powershell
   npm run dev
   ```

3. **You should see:**
   ```
   Database connected successfully
   Server running on http://localhost:3001
   Environment: development
   ```

## If the Server Won't Start

### Check 1: Is the port already in use?
```powershell
netstat -ano | findstr :3001
```
If something is using port 3001, either:
- Stop that process, OR
- Change the port in your `.env` file

### Check 2: Is the database running?
Make sure PostgreSQL is running and your `.env` file has the correct `DATABASE_URL`.

### Check 3: Are dependencies installed?
```powershell
npm install
```

### Check 4: Check for errors
Look at the terminal output when you run `npm run dev`. Common errors:
- **Database connection error** - Check your `.env` file
- **Port already in use** - Change port or stop other process
- **Module not found** - Run `npm install`

## Testing the Server

Once the server is running:

1. **Test health endpoint:**
   - Open browser: http://localhost:3001/api/health
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Test dashboard (after login):**
   - Use `test-login.ps1` to get a token
   - Use `test-dashboard.ps1` to see modules

## Common Issues

### "Cannot find module"
Run: `npm install`

### "Port 3001 already in use"
- Find the process: `netstat -ano | findstr :3001`
- Kill it: `taskkill /PID <process-id> /F`
- Or change port in `.env`

### "Database connection failed"
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Test connection: `psql -U your_user -d copier_meter_db`

### "EADDRINUSE: address already in use"
Something is already using port 3001. Change the port in `.env`:
```
PORT=3002
```
