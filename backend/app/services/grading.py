# ASTM D5430 Standard Test Methods for Visually Inspecting and Grading Fabrics (4-Point System)

def calculate_defect_points(defect_type: str, size_in: float) -> int:
    """
    Returns points (1 to 4) under the ASTM D5430 standard:
    - Defects up to 3 inches: 1 point
    - Defects > 3 to 6 inches: 2 points
    - Defects > 6 to 9 inches: 3 points
    - Defects > 9 inches: 4 points
    - Special rule for holes: up to 1 inch = 2 points, > 1 inch = 4 points
    """
    if defect_type == 'hole':
        return 2 if size_in <= 1.0 else 4
    
    if size_in <= 3.0:
        return 1
    elif size_in <= 6.0:
        return 2
    elif size_in <= 9.0:
        return 3
    else:
        return 4

def evaluate_roll_grade(
    total_points: int,
    length_m: float,
    width_in: float,
    grade_a_cutoff: float = 20.0,
    grade_b_cutoff: float = 40.0
):
    """
    Computes defect points per 100 square yards:
    Points / 100 sq yd = (Total Defect Points * 3600) / (Length in yards * Width in inches)
    where Length in yards = Length in metres * 1.09361

    Classification:
    - <= grade_a_cutoff: Grade A (Pass)
    - <= grade_b_cutoff: Grade B (Pass with concession)
    - > grade_b_cutoff: Reject
    """
    if length_m <= 0 or width_in <= 0:
        return "reject", "reject", 0.0, 0.0

    length_yd = length_m * 1.09361
    inspected_area_sq_yd = (length_yd * width_in) / 36.0
    
    points_per_100_sq_yd = (total_points * 3600.0) / (length_yd * width_in)
    points_per_100_sq_yd = round(points_per_100_sq_yd, 2)
    inspected_area_sq_yd = round(inspected_area_sq_yd, 2)

    if points_per_100_sq_yd <= grade_a_cutoff:
        return "A", "pass", points_per_100_sq_yd, inspected_area_sq_yd
    elif points_per_100_sq_yd <= grade_b_cutoff:
        return "B", "pass", points_per_100_sq_yd, inspected_area_sq_yd
    else:
        return "reject", "reject", points_per_100_sq_yd, inspected_area_sq_yd
