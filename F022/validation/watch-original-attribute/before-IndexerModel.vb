Imports System.Reflection

<DefaultMember("Item")>
Public NotInheritable Class IndexerModel
    Public ReadOnly Property Item(index As Integer) As IndexedValue
        Get
            Return New IndexedValue With {.Name = "Item"}
        End Get
    End Property

    Public ReadOnly Property Alternate(index As Integer) As IndexedValue
        Get
            Return New IndexedValue With {.Name = "Alternate"}
        End Get
    End Property
End Class

Public NotInheritable Class IndexedValue
    Public Property Name As String = String.Empty
End Class
