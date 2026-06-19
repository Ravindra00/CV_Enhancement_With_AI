import pymysql
import datetime

def main():
    conn = pymysql.connect(
        host='127.0.0.1',
        port=3306,
        user='admin',
        password='80lSDz%FaZlFpSQQ',
        database='antigravity',
        autocommit=True
    )
    cursor = conn.cursor()
    
    email = "ravindrapandey2073@gmail.com"
    name = "Rabindra Pandey"
    hashed_password = "$2b$12$/2QgsI0R4IvcWYOJPMYr9utgAjWH.Ry8meO5GCsIpwB1ehC8GrZTm"
    now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    # Check if user exists
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()

    if user:
        cursor.execute("""
            UPDATE users 
            SET is_superuser = 1, is_verified = 1, name = %s
            WHERE email = %s
        """, (name, email))
        print("User already existed, promoted to super admin and verified.")
    else:
        cursor.execute("""
            INSERT INTO users (name, email, hashed_password, is_active, is_superuser, ai_access, is_verified, created_at, updated_at, failed_login_attempts)
            VALUES (%s, %s, %s, 1, 1, 1, 1, %s, %s, 0)
        """, (name, email, hashed_password, now, now))
        print("User created successfully as super admin.")
        
    conn.close()

if __name__ == "__main__":
    main()
