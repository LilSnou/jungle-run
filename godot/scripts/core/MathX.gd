#
# MathX — 32-битная целочисленная арифметика для mulberry32 (как Math.imul в JS).
class_name MathX
extends Object


static func imul(a: int, b: int) -> int:
	var mul := (a * b) & 0xFFFFFFFF
	if mul >= 0x80000000:
		mul -= 0x100000000
	return mul
