from datetime import datetime, timedelta

def test_duplication_logic():
    print("Testing duplication logic...")
    source_date_str = "2023-01-01"
    source = datetime.strptime(source_date_str, "%Y-%m-%d").date()
    
    # Test Week (Next 6 days)
    target_dates_week = []
    print("\n--- Testing Week Duplication ---")
    for i in range(1, 7):
        target_date = source + timedelta(days=i)
        target_dates_week.append(target_date.strftime("%Y-%m-%d"))
    
    print(f"Source: {source_date_str}")
    print(f"Generated {len(target_dates_week)} dates for Week.")
    print(f"First: {target_dates_week[0]}")
    print(f"Last: {target_dates_week[-1]}")
    
    expected_first = (source + timedelta(days=1)).strftime("%Y-%m-%d")
    expected_last = (source + timedelta(days=6)).strftime("%Y-%m-%d")
    
    if target_dates_week[0] == expected_first and target_dates_week[-1] == expected_last and len(target_dates_week) == 6:
        print("✅ Week Logic Correct")
    else:
        print("❌ Week Logic Failed")

    # Test Month (Next 30 days)
    target_dates_month = []
    print("\n--- Testing Month Duplication ---")
    for i in range(1, 31):
        target_date = source + timedelta(days=i)
        target_dates_month.append(target_date.strftime("%Y-%m-%d"))
        
    print(f"Generated {len(target_dates_month)} dates for Month.")
    print(f"First: {target_dates_month[0]}")
    print(f"Last: {target_dates_month[-1]}")
    
    expected_first_m = (source + timedelta(days=1)).strftime("%Y-%m-%d")
    expected_last_m = (source + timedelta(days=30)).strftime("%Y-%m-%d")
    
    if target_dates_month[0] == expected_first_m and target_dates_month[-1] == expected_last_m and len(target_dates_month) == 30:
        print("✅ Month Logic Correct")
    else:
        print("❌ Month Logic Failed")

test_duplication_logic()
