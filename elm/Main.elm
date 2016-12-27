module Hello exposing (..)

import Html exposing (div, p, ul, li, text)


type alias Model =
    Int


type Msg
    = Noop
    | Something


view : Model -> Html.Html msg
view m =
    div []
        [ ul []
            [ li []
                [ text "Here is div again" ]
            ]
        ]


model : Model
model =
    0


update : Msg -> Model -> Model
update msg m =
    m


main : Program Never Model Msg
main =
    Html.beginnerProgram
        { model = model
        , view = view
        , update = update
        }
