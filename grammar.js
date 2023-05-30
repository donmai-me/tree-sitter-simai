const newline = /(\r?\n)+/;

module.exports = grammar({
    name: 'simai',

    extras: $ => [
        "\u{feff}",
        /[ \t]/,
        $.comment,
    ],

    inline: $ => [
        $._key_val,
        $._event,
        $.number,
    ],

    conflicts: $ => [],

    inline: $ => [],

    rules: {
        chart_file: $ => repeat($._key_val),

        _key_val: $ => choice(
            seq("&", choice(
                $.title,
                $.artist,
                $.first,
                $.chart_lvl,
                $.chart,
                $.extra,
            )),
            newline,
        ),

        title: $ => seq(
            $.title_key,
            "=",
            field("value", $.string)
        ),

        title_key: $ => "title",

        artist: $ => seq(
            $.artist_key,
            "=",
            field("value", $.string)
        ),

        artist_key: $ => "artist",

        first: $ => seq(
            $.first_key,
            optional(seq("_", field("chart_index", $.integer))),
            "=",
            field("value", $.number)
        ),

        first_key: $ => "first",

        chart_lvl: $ => seq(
            $.chart_lvl_key,
            "_",
            field("chart_index", $.integer),
            "=",
            field("value", $.string)
        ),

        chart_lvl_key: $ => "lv",

        extra: $ => seq(
            $.extra_key,
            optional(seq("_", field("chart_index", $.integer))),
            "=",
            field("value", choice($.number, $.string))
        ),

        extra_key: $ => /[a-z]+/,

        chart: $ => seq(
            $.chart_key,
            "_",
            field("chart_index", $.integer),
            "=",
            field("value", seq($._fragment, optional(newline)))
        ),

        chart_key: $ => "inote",

        endmark: $ => "E", // に希望と涙を添えて

        _fragment: $ => prec.right(choice(
            prec.right(seq(
                $._bpm_divisor,
                optional(newline),
                optional($._note),
            )),
            prec.right($._note),
            prec.right(2, seq($._fragment, optional(newline), $.tick, optional(newline))),
            prec.right(2, seq($._fragment, optional(newline), $.tick, optional(newline), $._fragment)),
            prec.right(3, seq($._fragment, optional(newline), $.tick, optional(newline), $.endmark))
        )),

        _bpm_divisor: $ => prec.right(choice(
            $.bpm,
            $.divisor,
            prec.right(1, seq($.bpm, optional(newline), $.divisor))
        )),

        _note: $ => prec.right(choice(
            prec.right(seq( // For cursed notation like `23`
                choice(
                    $.tap,
                    $.fake_note,
                ),
                optional(newline),
                repeat1(choice($.tap, $.fake_note)),
                optional(seq(
                    optional(newline),
                    choice(
                        $.each,
                        $.pseudo_each
                    ),
                    $._note
                )),
            )),
            prec.right(1, seq(
                choice(
                    $.fake_note,
                    $.touch_hold,
                    $.touch,
                    $.slide,
                    $.tap,
                    $.hold
                ),
                repeat(seq(
                    optional(newline),
                    choice(
                        $.each,
                        $.pseudo_each
                    ),
                    optional(newline),
                    choice(
                        $.fake_note,
                        $.touch_hold,
                        $.touch,
                        $.slide,
                        $.tap,
                        $.hold
                    )
                ))
            )),
        )),

        bpm: $ => seq(
            "(",
            $.number,
            ")"
        ),

        divisor: $ => seq(
            "{",
            choice(
                field("division", $.number),
                seq("#", field("absolute", $.number)) // if you unironically use this, may god have mercy
            ),
            "}"
        ),

        touch_hold: $ => prec(2, seq(
            $.touch_position,
            optional($.touch_modifiers),
            "h",
            optional($.touch_modifiers),
            optional($.duration),
        )),

        touch: $ => prec(1, seq(
            $.touch_position,
            optional($.touch_modifiers),
        )),

        hold: $ => prec(2, seq(
            $.button_position,
            optional($.hold_modifiers),
            "h",
            optional($.hold_modifiers),
            optional($.duration),
        )),

        tap: $ => prec(1, seq(
            $.button_position,
            optional($.tap_modifiers)
        )),

        fake_note: $ => "0",

        slide: $ => prec(3, seq(
            field("start_position", $.button_position),
            optional($.star_tap_modifiers),
            $.slide_variant,
            field("end_position", $.button_position),
            optional($.slide_modifiers),
            optional($.duration),
            optional(choice(
                $.sibling_slide,
                $.chain_slide
            )),
            optional($.slide_modifiers),
        )),

        sibling_slide: $ => seq(
            "*",
            $.slide_variant,
            field("end_position", $.button_position),
            optional($.duration),
            optional(choice(
                $.sibling_slide,
                $.chain_slide
            ))
        ),

        chain_slide: $ => seq(
            $.slide_variant,
            field("end_position", $.button_position),
            optional($.duration),
            optional($.chain_slide),
        ),

        each: $ => "/",

        pseudo_each: $ => "`",

        tick: $ => /,+/,

        touch_position: $ => choice(
            /[ABDE][1-8]/,
            /C[12]?/,
        ),

        button_position: $ => /[1-8]/,

        hold_modifiers: $ => /[bex]+/,

        star_tap_modifiers: $ => /[?bex]+/,

        tap_modifiers: $ => /[bex$]+/,

        slide_modifiers: $ => /[b@ex?$!]+/,

        touch_modifiers: $ => /[f]+/,

        slide_variant: $ => /[-^<>szvw]|(p{1,2})|(q{1,2})|(V[1-8])/,

        duration: $ => prec.right(seq(
            "[",
            optional($.first_number),
            optional($.double_pound),
            optional($.pound),
            optional($.colon),
            "]"
        )),

        first_number: $ => $.number,

        double_pound: $ => seq(
            "##",
            $.number,
        ),

        pound: $ => seq(
            "#",
            $.number,
        ),

        colon: $ => seq(
            ":",
            $.number
        ),

        comment: $ => seq("||", $.string, /\r?\n/),

        string: $ => /[^\r\n]*/,
        one_line_string: $ => seq(/[^\r\n&\|][^\r\n]*/, /\r?\n/),

        multiline_string: $ => seq($.string, newline, repeat(choice(
            prec.left(2, seq($.comment, optional(newline))),
            prec.left(1, seq($.one_line_string, newline))
        ))),

        number: $ => /([0-9]*[.])?[0-9]+/,

        integer: $ => /\d+/,
    },
});

