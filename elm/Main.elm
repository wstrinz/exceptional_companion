module Hello exposing (..)

import Html exposing (div, p, ul, li, text)


main : Html.Html msg
main =
    div []
        [ ul []
            [ li []
                [ text "Here is div" ]
            ]
        ]
