#
# AudioManager — чиптюновая музыка и эффекты (порт web AudioManager.js).
#
# Треки и эффекты заранее отрисованы tools/audiogen/render.py в WAV и
# импортируются движком. Плавные переходы между локациями — кроссфейдом
# двух музыкальных плееров; победа — фанфара вместо трека.
extends Node

const SFX_NAMES := [
	"biome", "click", "coin", "doublejump", "fall", "gameover",
	"heart", "hurt", "jump", "slide", "start", "stomp", "victory",
]
const MUSIC_NAMES := ["jungle", "village", "temple", "victory"]

const FADE_SPEED := 1.2     # линейный кроссфейд за ~0.8 c
const MUSIC_DB := -6.0      # музыка тише эффектов

var muted := false
var _sfx := {}
var _streams := {}
var _players: Array[AudioStreamPlayer] = []
var _targets: Array[float] = [0.0, 0.0]
var _current_idx := 0
var _current_song := ""


func _ready() -> void:
	for s in SFX_NAMES:
		var p := "res://assets/audio/sfx/%s.wav" % s
		if FileAccess.file_exists(p):
			_sfx[s] = load(p)
	for m in MUSIC_NAMES:
		var p := "res://assets/audio/music/%s.wav" % m
		if FileAccess.file_exists(p):
			var st: AudioStreamWAV = load(p)
			# зацикливание музыки (фанафара victory — без лупа)
			if m != "victory":
				st.loop_mode = AudioStreamWAV.LOOP_FORWARD
				st.loop_begin = 0
				st.loop_end = st.data.size() / 2  # mono 16-bit: байты/2 = фреймы
			_streams[m] = st
	for i in 2:
		var pl := AudioStreamPlayer.new()
		pl.volume_db = -80.0
		add_child(pl)
		_players.append(pl)
	EventBus.on("audio:toggle", toggle_mute)


## Проиграть эффект (имена: jump, coin, heart, ...).
func play(sfx_name: String) -> void:
	if muted:
		return
	var key := sfx_name.to_lower()
	if _sfx.has(key):
		var pl := AudioStreamPlayer.new()
		pl.stream = _sfx[key]
		add_child(pl)
		pl.finished.connect(pl.queue_free)
		pl.play()


## Сменить трек с плавным кроссфейдом.
func play_song(song: String) -> void:
	if song == _current_song and _players[_current_idx].playing:
		return
	_current_song = song
	if not _streams.has(song):
		return
	var next_idx := 1 - _current_idx
	var next := _players[next_idx]
	next.stream = _streams[song]
	next.volume_db = -80.0
	next.play()
	_targets[next_idx] = 1.0
	_targets[_current_idx] = 0.0
	_current_idx = next_idx


## Остановить музыку (победа/рестарт).
func stop_song() -> void:
	_current_song = ""
	for i in 2:
		_targets[i] = 0.0


func toggle_mute() -> void:
	muted = not muted
	if muted:
		# глушим и текущие эффекты
		for c in get_children():
			if c is AudioStreamPlayer and not _players.has(c):
				c.stop()


func _process(delta: float) -> void:
	for i in 2:
		var pl := _players[i]
		if pl.stream == null:
			continue
		var cur := pl.volume_db
		var target_db := -80.0 if muted else (
			MUSIC_DB if _targets[i] > 0.5 else -80.0)
		# линейный фейд в линейных единицах
		var cur_lin := db_to_linear(cur)
		var target_lin := db_to_linear(target_db) if target_db > -79.0 else 0.0
		var t_lin := lerpf(cur_lin, target_lin, clampf(delta * FADE_SPEED * 2.0, 0.0, 1.0))
		pl.volume_db = linear_to_db(maxf(t_lin, 0.0001))
		if t_lin < 0.005 and target_lin == 0.0 and pl.playing:
			pl.stop()
		elif target_lin > 0.0 and not pl.playing:
			pl.play()
